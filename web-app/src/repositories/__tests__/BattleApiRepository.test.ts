import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { BattleError } from "../../entities/BattleError";
import { textStream } from "../../test/streams";
import { BattleApiRepository } from "../BattleApiRepository";

let lastBody: unknown;
let lastAccept: string | null;

const server = setupServer(
    http.post("*/api/battles", async ({ request }) => {
        lastBody = await request.json();
        lastAccept = request.headers.get("Accept");
        const accent = new TextEncoder().encode("è");
        return new HttpResponse(
            textStream([
                "Pikachu entre. Salam",
                accent.slice(0, 1),
                accent.slice(1),
                "che aussi.\n",
                "VAINQUEUR: Pikachu",
            ]),
            {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "X-Session-Id": "session-1",
                },
            },
        );
    }),
);

async function readAll(chunks: AsyncIterable<string>): Promise<string[]> {
    const result: string[] = [];
    for await (const chunk of chunks) {
        result.push(chunk);
    }
    return result;
}

function errorOf(promise: Promise<unknown>): Promise<BattleError> {
    return promise.then(
        () => {
            throw new Error("expected a rejection");
        },
        error => error as BattleError,
    );
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
    server.resetHandlers();
    lastBody = undefined;
    lastAccept = null;
});
afterAll(() => server.close());

describe("BattleApiRepository.start", () => {
    it("posts the ids and decodes the stream chunk by chunk", async () => {
        const { sessionId, chunks } = await BattleApiRepository.start(
            ["25", "4"],
            new AbortController().signal,
        );
        const parts = await readAll(chunks);

        expect(lastBody).toEqual({ pokemonIds: ["25", "4"] });
        expect(lastAccept).toBe("text/plain");
        expect(sessionId).toBe("session-1");
        expect(parts.length).toBeGreaterThan(1);
        expect(parts.join("")).toBe(
            "Pikachu entre. Salamèche aussi.\nVAINQUEUR: Pikachu",
        );
        expect(parts.join("")).not.toContain("�");
    });

    it("maps a 404 to a BattleError with the missing ids", async () => {
        server.use(
            http.post("*/api/battles", () =>
                HttpResponse.json(
                    {
                        code: "ERR_POKEMON_NOT_FOUND",
                        message: "Pokemon not found: 999",
                        value: ["999"],
                    },
                    { status: 404 },
                ),
            ),
        );

        const error = await errorOf(
            BattleApiRepository.start(
                ["25", "999"],
                new AbortController().signal,
            ),
        );

        expect(error).toBeInstanceOf(BattleError);
        expect(error.status).toBe(404);
        expect(error.code).toBe("ERR_POKEMON_NOT_FOUND");
        expect(error.missingIds).toEqual(["999"]);
    });

    it("maps a 429 and reads Retry-After", async () => {
        server.use(
            http.post("*/api/battles", () =>
                HttpResponse.json(
                    {
                        code: "ERR_CHATBOT_RATE_LIMITED",
                        message: "Rate limited",
                        value: null,
                    },
                    { status: 429, headers: { "Retry-After": "30" } },
                ),
            ),
        );

        const error = await errorOf(
            BattleApiRepository.start(
                ["25", "4"],
                new AbortController().signal,
            ),
        );

        expect(error.status).toBe(429);
        expect(error.retryAfterSeconds).toBe(30);
    });

    it("maps a 502 without JSON body", async () => {
        server.use(
            http.post(
                "*/api/battles",
                () => new HttpResponse("Bad gateway", { status: 502 }),
            ),
        );

        const error = await errorOf(
            BattleApiRepository.start(
                ["25", "4"],
                new AbortController().signal,
            ),
        );

        expect(error.status).toBe(502);
        expect(error.code).toBe("ERR_HTTP_502");
    });

    it("maps a network failure", async () => {
        server.use(http.post("*/api/battles", () => HttpResponse.error()));

        const error = await errorOf(
            BattleApiRepository.start(
                ["25", "4"],
                new AbortController().signal,
            ),
        );

        expect(error.code).toBe(BattleError.NETWORK);
    });

    it("rethrows the abort without mapping it", async () => {
        const controller = new AbortController();
        controller.abort();

        const error = await errorOf(
            BattleApiRepository.start(["25", "4"], controller.signal),
        );

        expect(error).not.toBeInstanceOf(BattleError);
    });
});
