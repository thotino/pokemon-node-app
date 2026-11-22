import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HTTPError, type NormalizedOptions, type ResponsePromise } from "ky";
import type ChatbotAuthRepositoryClass from "../ChatbotAuthRepository";
import { IChatbotTokens } from "../../types/chatbot";
import { chatbotConnector } from "../../connectors";

vi.mock("../../connectors", () => ({
    chatbotConnector: {
        apiKey: "vb_ak_test",
        client: { post: vi.fn() },
    },
}));

const NOW = new Date("2026-11-19T10:00:00Z");
const ONE_HOUR_MS = 3_600_000;
const TOKEN_PATH = "v1/auth/api-key/token";
const REFRESH_PATH = "v1/auth/api-key/refresh";
const CHATBOT_ID = "bot-from-token";

type Routes = {
    onToken?: () => ResponsePromise;
    onRefresh?: () => ResponsePromise;
};

let ChatbotAuthRepository: typeof ChatbotAuthRepositoryClass;
let tokenCount = 0;
let refreshCount = 0;

function json(body: unknown) {
    return { json: () => Promise.resolve(body) } as unknown as ResponsePromise;
}

function tokenResponse(prefix: string, count: number, chatbotId = CHATBOT_ID) {
    return json({
        accessToken: `${prefix}-access-${count}`,
        refreshToken: `${prefix}-refresh-${count}`,
        expiresIn: 3600,
        chatbotId,
    });
}

function httpError(status: number, path: string) {
    return new HTTPError(
        new Response("", { status }),
        new Request(`https://chatbot.test/${path}`, { method: "POST" }),
        {} as NormalizedOptions,
    );
}

function failure(status: number, path: string) {
    const error = httpError(status, path);
    return { json: () => Promise.reject(error) } as unknown as ResponsePromise;
}

function route({
    onToken = () => tokenResponse("token", ++tokenCount),
    onRefresh = () => tokenResponse("refreshed", ++refreshCount),
}: Routes = {}) {
    vi.mocked(chatbotConnector.client.post).mockImplementation(path => {
        if (path === TOKEN_PATH) {
            return onToken();
        }
        if (path === REFRESH_PATH) {
            return onRefresh();
        }
        return failure(404, String(path));
    });
}

const EXCHANGE_CALL = [TOKEN_PATH, { json: { apiKey: "vb_ak_test" } }];

function refreshCall(refreshToken: string, chatbotId = CHATBOT_ID) {
    return [REFRESH_PATH, { json: { refreshToken, chatbotId } }];
}

function advanceTime(offsetMs: number) {
    vi.setSystemTime(NOW.getTime() + offsetMs);
}

describe("ChatbotAuthRepository", () => {
    beforeEach(async () => {
        vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
        vi.resetModules();
        ({ default: ChatbotAuthRepository } =
            await import("../ChatbotAuthRepository"));
        tokenCount = 0;
        refreshCount = 0;
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    describe("getTokens", () => {
        it("exchanges the api key on the first call", async () => {
            route();

            const tokens = await ChatbotAuthRepository.getTokens();

            expect(
                chatbotConnector.client.post,
            ).toHaveBeenCalledExactlyOnceWith(TOKEN_PATH, {
                json: { apiKey: "vb_ak_test" },
            });
            expect(tokens).toEqual({
                accessToken: "token-access-1",
                refreshToken: "token-refresh-1",
                chatbotId: CHATBOT_ID,
                expiresAt: NOW.getTime() + ONE_HOUR_MS,
            });
        });

        it("returns cached tokens while they are valid", async () => {
            route();

            const first = await ChatbotAuthRepository.getTokens();
            const second = await ChatbotAuthRepository.getTokens();

            expect(second).toBe(first);
            expect(chatbotConnector.client.post).toHaveBeenCalledTimes(1);
        });

        it("shares a single exchange between concurrent calls", async () => {
            route();

            const results = await Promise.all([
                ChatbotAuthRepository.getTokens(),
                ChatbotAuthRepository.getTokens(),
                ChatbotAuthRepository.getTokens(),
            ]);

            expect(vi.mocked(chatbotConnector.client.post).mock.calls).toEqual([
                EXCHANGE_CALL,
            ]);
            expect(new Set(results).size).toBe(1);
        });

        it("refreshes expired tokens", async () => {
            route();

            await ChatbotAuthRepository.getTokens();
            advanceTime(ONE_HOUR_MS);
            const tokens = await ChatbotAuthRepository.getTokens();

            expect(vi.mocked(chatbotConnector.client.post).mock.calls).toEqual([
                EXCHANGE_CALL,
                refreshCall("token-refresh-1"),
            ]);
            expect(tokens).toEqual({
                accessToken: "refreshed-access-1",
                refreshToken: "refreshed-refresh-1",
                chatbotId: CHATBOT_ID,
                expiresAt: NOW.getTime() + 2 * ONE_HOUR_MS,
            });
        });

        it("keeps tokens until the expiry margin", async () => {
            route();

            await ChatbotAuthRepository.getTokens();
            advanceTime(ONE_HOUR_MS - 30_001);
            await ChatbotAuthRepository.getTokens();

            expect(chatbotConnector.client.post).toHaveBeenCalledTimes(1);
        });

        it("refreshes tokens within the expiry margin", async () => {
            route();

            await ChatbotAuthRepository.getTokens();
            advanceTime(ONE_HOUR_MS - 30_000);
            await ChatbotAuthRepository.getTokens();

            expect(vi.mocked(chatbotConnector.client.post).mock.calls).toEqual([
                EXCHANGE_CALL,
                refreshCall("token-refresh-1"),
            ]);
        });

        it("refreshes with the latest refresh token", async () => {
            route();

            await ChatbotAuthRepository.getTokens();
            advanceTime(ONE_HOUR_MS);
            await ChatbotAuthRepository.getTokens();
            advanceTime(2 * ONE_HOUR_MS);
            const tokens = await ChatbotAuthRepository.getTokens();

            expect(vi.mocked(chatbotConnector.client.post).mock.calls).toEqual([
                EXCHANGE_CALL,
                refreshCall("token-refresh-1"),
                refreshCall("refreshed-refresh-1"),
            ]);
            expect(tokens.accessToken).toBe("refreshed-access-2");
        });

        it("follows the chatbot id returned by a rotation", async () => {
            route({
                onRefresh: () =>
                    tokenResponse("refreshed", ++refreshCount, "bot-2"),
            });

            await ChatbotAuthRepository.getTokens();
            advanceTime(ONE_HOUR_MS);
            const rotated = await ChatbotAuthRepository.getTokens();
            advanceTime(2 * ONE_HOUR_MS);
            await ChatbotAuthRepository.getTokens();

            expect(rotated.chatbotId).toBe("bot-2");
            expect(vi.mocked(chatbotConnector.client.post).mock.calls).toEqual([
                EXCHANGE_CALL,
                refreshCall("token-refresh-1"),
                refreshCall("refreshed-refresh-1", "bot-2"),
            ]);
        });

        it("shares a single refresh between concurrent calls", async () => {
            route();

            await ChatbotAuthRepository.getTokens();
            advanceTime(ONE_HOUR_MS);
            const results = await Promise.all([
                ChatbotAuthRepository.getTokens(),
                ChatbotAuthRepository.getTokens(),
                ChatbotAuthRepository.getTokens(),
            ]);

            expect(vi.mocked(chatbotConnector.client.post).mock.calls).toEqual([
                EXCHANGE_CALL,
                refreshCall("token-refresh-1"),
            ]);
            expect(new Set(results).size).toBe(1);
        });

        it("exchanges the api key again when the refresh fails", async () => {
            route({ onRefresh: () => failure(401, REFRESH_PATH) });

            await ChatbotAuthRepository.getTokens();
            advanceTime(ONE_HOUR_MS);
            const tokens = await ChatbotAuthRepository.getTokens();

            expect(vi.mocked(chatbotConnector.client.post).mock.calls).toEqual([
                EXCHANGE_CALL,
                refreshCall("token-refresh-1"),
                EXCHANGE_CALL,
            ]);
            expect(tokens.accessToken).toBe("token-access-2");
        });

        it("falls back to the exchange on any refresh error", async () => {
            route({ onRefresh: () => failure(500, REFRESH_PATH) });

            await ChatbotAuthRepository.getTokens();
            advanceTime(ONE_HOUR_MS);
            const tokens = await ChatbotAuthRepository.getTokens();

            expect(vi.mocked(chatbotConnector.client.post).mock.calls).toEqual([
                EXCHANGE_CALL,
                refreshCall("token-refresh-1"),
                EXCHANGE_CALL,
            ]);
            expect(tokens.accessToken).toBe("token-access-2");
        });

        it("rejects when the exchange fails", async () => {
            route({ onToken: () => failure(503, TOKEN_PATH) });

            const error = await ChatbotAuthRepository.getTokens().catch(
                error => error,
            );

            expect(error).toBeInstanceOf(HTTPError);
            expect(error.response.status).toBe(503);
        });

        it("does not cache a failed authentication", async () => {
            let calls = 0;
            route({
                onToken: () =>
                    ++calls === 1
                        ? failure(503, TOKEN_PATH)
                        : tokenResponse("token", ++tokenCount),
            });

            await ChatbotAuthRepository.getTokens().catch(() => undefined);
            const tokens = await ChatbotAuthRepository.getTokens();

            expect(vi.mocked(chatbotConnector.client.post).mock.calls).toEqual([
                EXCHANGE_CALL,
                EXCHANGE_CALL,
            ]);
            expect(tokens.accessToken).toBe("token-access-1");
        });

        it("rejects when both refresh and exchange fail", async () => {
            let calls = 0;
            route({
                onToken: () =>
                    ++calls === 1
                        ? tokenResponse("token", ++tokenCount)
                        : failure(503, TOKEN_PATH),
                onRefresh: () => failure(401, REFRESH_PATH),
            });

            await ChatbotAuthRepository.getTokens();
            advanceTime(ONE_HOUR_MS);
            const error = await ChatbotAuthRepository.getTokens().catch(
                error => error,
            );

            expect(error).toBeInstanceOf(HTTPError);
            expect(error.response.status).toBe(503);
            expect(vi.mocked(chatbotConnector.client.post).mock.calls).toEqual([
                EXCHANGE_CALL,
                refreshCall("token-refresh-1"),
                EXCHANGE_CALL,
            ]);
        });
    });

    describe("invalidate", () => {
        it("forgets the current tokens", async () => {
            route();

            const tokens = await ChatbotAuthRepository.getTokens();
            ChatbotAuthRepository.invalidate(tokens);
            const renewed = await ChatbotAuthRepository.getTokens();

            expect(vi.mocked(chatbotConnector.client.post).mock.calls).toEqual([
                EXCHANGE_CALL,
                EXCHANGE_CALL,
            ]);
            expect(renewed.accessToken).toBe("token-access-2");
        });

        it("ignores tokens that were already replaced", async () => {
            route();

            const stale = await ChatbotAuthRepository.getTokens();
            advanceTime(ONE_HOUR_MS);
            const fresh = await ChatbotAuthRepository.getTokens();
            ChatbotAuthRepository.invalidate(stale);
            const current = await ChatbotAuthRepository.getTokens();

            expect(current).toBe(fresh);
            expect(vi.mocked(chatbotConnector.client.post).mock.calls).toEqual([
                EXCHANGE_CALL,
                refreshCall("token-refresh-1"),
            ]);
        });

        it("does nothing when no tokens are cached", () => {
            route();
            const tokens: IChatbotTokens = {
                accessToken: "unknown-access",
                refreshToken: "unknown-refresh",
                chatbotId: CHATBOT_ID,
                expiresAt: NOW.getTime() + ONE_HOUR_MS,
            };

            expect(() =>
                ChatbotAuthRepository.invalidate(tokens),
            ).not.toThrow();
            expect(chatbotConnector.client.post).not.toHaveBeenCalled();
        });
    });
});
