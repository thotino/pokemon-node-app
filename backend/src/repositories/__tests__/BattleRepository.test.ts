import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HTTPError } from "ky";
import { Readable } from "node:stream";
import BattleRepository from "../BattleRepository";
import ChatbotRateLimitError from "../../errors/ChatbotRateLimitError";

vi.mock("../../connectors", async () => {
    const { default: ChatbotConnector } =
        await import("../../connectors/ChatbotConnector");
    return {
        chatbotConnector: new ChatbotConnector(
            {
                url: "https://chatbot.test",
                apiKey: "vb_ak_test",
            },
            { limit: 0, maxRetryAfterMs: 0, backoffLimitMs: 0 },
        ),
    };
});

const NOW = new Date("2026-11-19T10:00:00Z");
const TOKEN_URL = "https://chatbot.test/v1/auth/api-key/token";
const REFRESH_URL = "https://chatbot.test/v1/auth/api-key/refresh";
const CHATBOT_ID = "bot-from-token";
const QUERY_URL = `https://chatbot.test/v1/open-completion/${CHATBOT_ID}/query`;

type SentRequest = {
    url: string;
    method: string;
    headers: Headers;
    body: unknown;
};

const fetchMock = vi.fn<typeof fetch>();

let sent: SentRequest[] = [];
let tokenCount = 0;
let refreshCount = 0;

function tokenResponse(prefix: string, count: number, chatbotId = CHATBOT_ID) {
    return Response.json({
        accessToken: `${prefix}-access-${count}`,
        refreshToken: `${prefix}-refresh-${count}`,
        expiresIn: 3600,
        chatbotId,
    });
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

function route(
    onQuery: (request: Request) => Response | Promise<Response> = () =>
        streamResponse(["ok"]),
    onRefresh: () => Response = () =>
        tokenResponse("refreshed", ++refreshCount),
) {
    fetchMock.mockImplementation(async input => {
        const request = input as Request;
        request.signal.throwIfAborted();
        const text = await request.text();
        sent.push({
            url: request.url,
            method: request.method,
            headers: request.headers,
            body: text.length === 0 ? undefined : JSON.parse(text),
        });
        if (request.url === TOKEN_URL) {
            return tokenResponse("token", ++tokenCount);
        }
        if (request.url === REFRESH_URL) {
            return onRefresh();
        }
        return onQuery(request);
    });
}

function requestsTo(url: string): SentRequest[] {
    return sent.filter(request => request.url === url);
}

async function readAll(stream: Readable) {
    const chunks: string[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk).toString());
    }
    return chunks;
}

function query(sessionId?: string, signal = new AbortController().signal) {
    return BattleRepository.query("Pikachu vs Dracaufeu", signal, sessionId);
}

describe("BattleRepository", () => {
    beforeEach(() => {
        vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
        vi.stubGlobal("fetch", fetchMock);
        BattleRepository.clearTokens();
        sent = [];
        tokenCount = 0;
        refreshCount = 0;
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    describe("exchangeApiKey", () => {
        it("exchanges the api key for tokens valid one hour", async () => {
            route();

            const tokens = await BattleRepository.exchangeApiKey();

            const [request] = requestsTo(TOKEN_URL);
            expect(request.body).toEqual({ apiKey: "vb_ak_test" });
            expect(tokens).toEqual({
                accessToken: "token-access-1",
                refreshToken: "token-refresh-1",
                chatbotId: CHATBOT_ID,
                expiresAt: NOW.getTime() + 3_600_000,
            });
        });
    });

    describe("refreshTokens", () => {
        it("sends the refresh token and the chatbot id", async () => {
            route();

            const tokens = await BattleRepository.refreshTokens({
                accessToken: "old-access",
                refreshToken: "old-refresh",
                chatbotId: CHATBOT_ID,
                expiresAt: NOW.getTime(),
            });

            const [request] = requestsTo(REFRESH_URL);
            expect(request.body).toEqual({
                refreshToken: "old-refresh",
                chatbotId: CHATBOT_ID,
            });
            expect(tokens.refreshToken).toBe("refreshed-refresh-1");
        });
    });

    describe("query", () => {
        it("queries the chatbot and streams the chunks in order", async () => {
            route(() =>
                streamResponse(["Pikachu ", "attaque ", "!"], {
                    "x-session-id": "s-1",
                }),
            );

            const result = await query();

            const [request] = requestsTo(QUERY_URL);
            expect(request.method).toBe("POST");
            expect(request.headers.get("authorization")).toBe(
                "Bearer token-access-1",
            );
            expect(request.headers.has("x-session-id")).toBe(false);
            expect(request.body).toEqual({
                query: "Pikachu vs Dracaufeu",
            });
            expect(result.sessionId).toBe("s-1");
            expect(await readAll(result.stream)).toEqual([
                "Pikachu ",
                "attaque ",
                "!",
            ]);
        });

        it("sends the session id on a follow-up question", async () => {
            route();

            const result = await query("s-1");

            const [request] = requestsTo(QUERY_URL);
            expect(request.headers.get("x-session-id")).toBe("s-1");
            expect(result.sessionId).toBe("s-1");
        });

        it("reuses cached tokens across queries", async () => {
            route();

            await query();
            await query();

            expect(requestsTo(TOKEN_URL)).toHaveLength(1);
            expect(requestsTo(QUERY_URL)).toHaveLength(2);
        });

        it("shares a single exchange between concurrent queries", async () => {
            route();

            await Promise.all([query(), query(), query()]);

            expect(requestsTo(TOKEN_URL)).toHaveLength(1);
        });

        it("refreshes expired tokens with the latest refresh token", async () => {
            route();

            await query();
            vi.setSystemTime(NOW.getTime() + 3_600_000);
            await query();
            vi.setSystemTime(NOW.getTime() + 7_200_000);
            await query();

            const refreshes = requestsTo(REFRESH_URL).map(
                request => request.body as { refreshToken: string },
            );
            expect(requestsTo(TOKEN_URL)).toHaveLength(1);
            expect(refreshes.map(body => body.refreshToken)).toEqual([
                "token-refresh-1",
                "refreshed-refresh-1",
            ]);
            expect(
                requestsTo(QUERY_URL).at(-1)!.headers.get("authorization"),
            ).toBe("Bearer refreshed-access-2");
        });

        it("follows the chatbot id returned by the latest token rotation", async () => {
            route(undefined, () => tokenResponse("refreshed", 1, "bot-2"));

            await query();
            vi.setSystemTime(NOW.getTime() + 3_600_000);
            await query();

            expect(sent.at(-1)!.url).toBe(
                "https://chatbot.test/v1/open-completion/bot-2/query",
            );
        });

        it("refreshes tokens shortly before they expire", async () => {
            route();

            await query();
            vi.setSystemTime(NOW.getTime() + 3_600_000 - 20_000);
            await query();

            expect(requestsTo(REFRESH_URL)).toHaveLength(1);
        });

        it("exchanges the api key again when the refresh fails", async () => {
            route(undefined, () => new Response("", { status: 401 }));

            await query();
            vi.setSystemTime(NOW.getTime() + 3_600_000);
            await query();

            expect(requestsTo(REFRESH_URL)).toHaveLength(1);
            expect(requestsTo(TOKEN_URL)).toHaveLength(2);
        });

        it("retries once with new tokens after a 401", async () => {
            let calls = 0;
            route(() =>
                ++calls === 1
                    ? new Response("", { status: 401 })
                    : streamResponse(["ok"]),
            );

            const result = await query();

            expect(await readAll(result.stream)).toEqual(["ok"]);
            expect(requestsTo(TOKEN_URL)).toHaveLength(2);
            expect(
                requestsTo(QUERY_URL).map(request =>
                    request.headers.get("authorization"),
                ),
            ).toEqual(["Bearer token-access-1", "Bearer token-access-2"]);
        });

        it("gives up after a second 401", async () => {
            route(() => new Response("", { status: 401 }));

            await expect(query()).rejects.toBeInstanceOf(HTTPError);
            expect(requestsTo(QUERY_URL)).toHaveLength(2);
        });

        it("turns a 429 into a ChatbotRateLimitError", async () => {
            route(
                () =>
                    new Response("", {
                        status: 429,
                        headers: { "retry-after": "12" },
                    }),
            );

            const error = await query().catch(error => error);

            expect(error).toBeInstanceOf(ChatbotRateLimitError);
            expect(error.retryAfterSeconds).toBe(12);
            expect(error.cause).toBeInstanceOf(HTTPError);
        });

        it("passes the abort signal to the chatbot request", async () => {
            route();
            const controller = new AbortController();
            controller.abort();

            await expect(query(undefined, controller.signal)).rejects.toThrow();
            expect(requestsTo(QUERY_URL)).toHaveLength(0);
        });
    });
});
