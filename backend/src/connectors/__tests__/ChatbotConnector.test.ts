import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HTTPError } from "ky";
import ChatbotConnector from "../ChatbotConnector";

const PARAMS = {
    url: "https://chatbot.test",
    apiKey: "vb_ak_test",
};
const RETRY = { limit: 2, maxRetryAfterMs: 2000, backoffLimitMs: 100 };

const fetchMock = vi.fn<typeof fetch>();

function lastRequest(): Request {
    return fetchMock.mock.calls.at(-1)![0] as Request;
}

describe("ChatbotConnector", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock);
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("exposes the api key", () => {
        const connector = new ChatbotConnector(PARAMS, RETRY);
        expect(connector.apiKey).toBe("vb_ak_test");
    });

    it("resolves paths against the base url", async () => {
        fetchMock.mockResolvedValue(new Response("ok"));
        const connector = new ChatbotConnector(PARAMS, RETRY);

        await connector.client.post("v1/auth/api-key/token");

        expect(lastRequest().url).toBe(
            "https://chatbot.test/v1/auth/api-key/token",
        );
    });

    it("adds the session header with withSession", async () => {
        fetchMock.mockResolvedValue(new Response("ok"));
        const connector = new ChatbotConnector(PARAMS, RETRY);

        await connector.withSession("abc").post("query");

        expect(lastRequest().headers.get("x-session-id")).toBe("abc");
    });

    it("does not alter the base client", async () => {
        fetchMock.mockResolvedValue(new Response("ok"));
        const connector = new ChatbotConnector(PARAMS, RETRY);

        connector.withSession("abc");
        await connector.client.post("query");

        expect(lastRequest().headers.has("x-session-id")).toBe(false);
    });

    it("sends no session header without a session id", async () => {
        fetchMock.mockResolvedValue(new Response("ok"));
        const connector = new ChatbotConnector(PARAMS, RETRY);

        await connector.withSession().post("query");

        expect(lastRequest().headers.has("x-session-id")).toBe(false);
    });

    it("reads the session id from the response headers", () => {
        const response = new Response("", {
            headers: { "x-session-id": "s-42" },
        });
        expect(ChatbotConnector.readSessionId(response)).toBe("s-42");
        expect(ChatbotConnector.readSessionId(new Response(""))).toBe(
            undefined,
        );
    });

    it("parses retry-after in seconds and as a date", () => {
        vi.useFakeTimers({ now: new Date("2026-11-19T10:00:00Z") });
        const inSeconds = new Response("", { headers: { "retry-after": "3" } });
        const asDate = new Response("", {
            headers: { "retry-after": "Thu, 19 Nov 2026 10:00:05 GMT" },
        });

        expect(ChatbotConnector.retryAfterMs(inSeconds)).toBe(3000);
        expect(ChatbotConnector.retryAfterMs(asDate)).toBe(5000);
        expect(ChatbotConnector.retryAfterMs(new Response(""))).toBe(undefined);
    });

    it("retries a rate limited post after the retry-after delay", async () => {
        vi.useFakeTimers();
        fetchMock
            .mockResolvedValueOnce(
                new Response("", {
                    status: 429,
                    headers: { "retry-after": "1" },
                }),
            )
            .mockResolvedValueOnce(new Response("ok"));
        const connector = new ChatbotConnector(PARAMS, RETRY);

        const pending = connector.client.post("query").text();
        await vi.advanceTimersByTimeAsync(999);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);

        await expect(pending).resolves.toBe("ok");
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("throws an HTTPError once the retry limit is reached", async () => {
        fetchMock.mockImplementation(
            async () =>
                new Response("", {
                    status: 429,
                    headers: { "retry-after": "0" },
                }),
        );
        const connector = new ChatbotConnector(PARAMS, RETRY);

        await expect(connector.client.post("query")).rejects.toBeInstanceOf(
            HTTPError,
        );
        expect(fetchMock).toHaveBeenCalledTimes(RETRY.limit + 1);
    });

    it("gives up at once when retry-after exceeds the maximum wait", async () => {
        fetchMock.mockResolvedValue(
            new Response("", { status: 429, headers: { "retry-after": "60" } }),
        );
        const connector = new ChatbotConnector(PARAMS, RETRY);

        await expect(connector.client.post("query")).rejects.toBeInstanceOf(
            HTTPError,
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("does not retry other client errors", async () => {
        fetchMock.mockResolvedValue(new Response("", { status: 400 }));
        const connector = new ChatbotConnector(PARAMS, RETRY);

        await expect(connector.client.post("query")).rejects.toBeInstanceOf(
            HTTPError,
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
