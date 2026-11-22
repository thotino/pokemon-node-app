import { beforeEach, describe, expect, it, vi } from "vitest";
import { HTTPError, type NormalizedOptions, type ResponsePromise } from "ky";
import { Readable } from "node:stream";
import BattleRepository from "../BattleRepository";
import ChatbotAuthRepository from "../ChatbotAuthRepository";
import { chatbotConnector } from "../../connectors";
import ChatbotRateLimitError from "../../errors/ChatbotRateLimitError";
import ChatbotUnavailableError from "../../errors/ChatbotUnavailableError";
import { IChatbotTokens } from "../../types/chatbot";

vi.mock("../../connectors", () => {
    const client = { post: vi.fn() };
    return {
        chatbotConnector: {
            client,
            withSession: vi.fn(() => client),
        },
    };
});
vi.mock("../ChatbotAuthRepository");

const CHATBOT_ID = "bot-from-token";
const QUERY_PATH = `v1/open-completion/${CHATBOT_ID}/query`;

function tokens(count: number, chatbotId = CHATBOT_ID): IChatbotTokens {
    return {
        accessToken: `access-${count}`,
        refreshToken: `refresh-${count}`,
        chatbotId,
        expiresAt: Date.now() + 3_600_000,
    };
}

function streamResponse(chunks: string[], headers: HeadersInit = {}) {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
        start(controller) {
            chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
            controller.close();
        },
    });
    return new Response(body, { headers });
}

function httpError(status: number, headers: HeadersInit = {}) {
    return new HTTPError(
        new Response("", { status, headers }),
        new Request(`https://chatbot.test/${QUERY_PATH}`, { method: "POST" }),
        {} as NormalizedOptions,
    );
}

function reply(response: Response) {
    return Promise.resolve(response) as ResponsePromise;
}

function fail(error: Error) {
    return Promise.reject(error) as ResponsePromise;
}

async function readText(stream: Readable) {
    let text = "";
    for await (const chunk of stream) {
        text += Buffer.from(chunk).toString();
    }
    return text;
}

function query(sessionId?: string, signal = new AbortController().signal) {
    return BattleRepository.query("Pikachu vs Dracaufeu", signal, sessionId);
}

describe("BattleRepository", () => {
    beforeEach(() => {
        vi.mocked(chatbotConnector.withSession).mockReturnValue(
            chatbotConnector.client,
        );
        vi.mocked(ChatbotAuthRepository.getTokens).mockResolvedValue(tokens(1));
        vi.mocked(chatbotConnector.client.post).mockImplementation(() =>
            reply(streamResponse(["ok"])),
        );
    });

    describe("query", () => {
        it("queries the chatbot and streams its answer", async () => {
            vi.mocked(chatbotConnector.client.post).mockImplementation(() =>
                reply(
                    streamResponse(["Pikachu ", "attaque ", "!"], {
                        "x-session-id": "s-1",
                    }),
                ),
            );
            const signal = new AbortController().signal;

            const result = await query(undefined, signal);

            expect(chatbotConnector.withSession).toHaveBeenCalledWith(
                undefined,
            );
            expect(
                chatbotConnector.client.post,
            ).toHaveBeenCalledExactlyOnceWith(QUERY_PATH, {
                json: { query: "Pikachu vs Dracaufeu" },
                headers: { Authorization: "Bearer access-1" },
                signal,
            });
            expect(result.sessionId).toBe("s-1");
            expect(await readText(result.stream)).toBe("Pikachu attaque !");
        });

        it("sends the session id on a follow-up question", async () => {
            const result = await query("s-1");

            expect(chatbotConnector.withSession).toHaveBeenCalledWith("s-1");
            expect(result.sessionId).toBe("s-1");
        });

        it("queries the chatbot id given by the tokens", async () => {
            vi.mocked(ChatbotAuthRepository.getTokens).mockResolvedValue(
                tokens(1, "bot/2"),
            );

            await query();

            expect(
                vi.mocked(chatbotConnector.client.post).mock.calls[0][0],
            ).toBe("v1/open-completion/bot%2F2/query");
        });

        it("retries once with new tokens after a 401", async () => {
            const rejected = tokens(1);
            vi.mocked(ChatbotAuthRepository.getTokens)
                .mockResolvedValueOnce(rejected)
                .mockResolvedValueOnce(tokens(2));
            vi.mocked(chatbotConnector.client.post).mockImplementationOnce(() =>
                fail(httpError(401)),
            );

            const result = await query();

            expect(await readText(result.stream)).toBe("ok");
            expect(
                ChatbotAuthRepository.invalidate,
            ).toHaveBeenCalledExactlyOnceWith(rejected);
            expect(chatbotConnector.client.post).toHaveBeenNthCalledWith(
                1,
                QUERY_PATH,
                expect.objectContaining({
                    headers: { Authorization: "Bearer access-1" },
                }),
            );
            expect(chatbotConnector.client.post).toHaveBeenNthCalledWith(
                2,
                QUERY_PATH,
                expect.objectContaining({
                    headers: { Authorization: "Bearer access-2" },
                }),
            );
        });

        it("gives up after a second 401", async () => {
            vi.mocked(chatbotConnector.client.post).mockImplementation(() =>
                fail(httpError(401)),
            );

            const error = await query().catch(error => error);

            expect(error).toBeInstanceOf(ChatbotUnavailableError);
            expect(error.cause).toBeInstanceOf(HTTPError);
            expect(chatbotConnector.client.post).toHaveBeenCalledTimes(2);
            expect(ChatbotAuthRepository.invalidate).toHaveBeenCalledOnce();
        });

        it("turns a chatbot failure into a ChatbotUnavailableError", async () => {
            const cause = httpError(503);
            vi.mocked(chatbotConnector.client.post).mockImplementation(() =>
                fail(cause),
            );

            const error = await query().catch(error => error);

            expect(error).toBeInstanceOf(ChatbotUnavailableError);
            expect(error.code).toBe("ERR_CHATBOT_UNAVAILABLE");
            expect(error.cause).toBe(cause);
            expect(chatbotConnector.client.post).toHaveBeenCalledOnce();
            expect(ChatbotAuthRepository.invalidate).not.toHaveBeenCalled();
        });

        it("turns a 429 into a ChatbotRateLimitError", async () => {
            const cause = httpError(429, { "retry-after": "12" });
            vi.mocked(chatbotConnector.client.post).mockImplementation(() =>
                fail(cause),
            );

            const error = await query().catch(error => error);

            expect(error).toBeInstanceOf(ChatbotRateLimitError);
            expect(error.retryAfterSeconds).toBe(12);
            expect(error.cause).toBe(cause);
        });

        it("turns an authentication failure into a ChatbotUnavailableError", async () => {
            const cause = httpError(503);
            vi.mocked(ChatbotAuthRepository.getTokens).mockRejectedValue(cause);

            const error = await query().catch(error => error);

            expect(error).toBeInstanceOf(ChatbotUnavailableError);
            expect(error.cause).toBe(cause);
            expect(chatbotConnector.client.post).not.toHaveBeenCalled();
        });

        it("rethrows unexpected errors untouched", async () => {
            const cause = new Error("boom");
            vi.mocked(chatbotConnector.client.post).mockImplementation(() =>
                fail(cause),
            );

            const error = await query().catch(error => error);

            expect(error).toBe(cause);
        });
    });
});
