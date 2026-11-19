import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pokemon } from "../../entities/Pokemon";
import { bulbasaur, charmander } from "../../test/fixtures";
import { pendingStream, textStream } from "../../test/streams";
import { useBattle } from "../useBattle";

const fighters = [new Pokemon(bulbasaur), new Pokemon(charmander)];

const server = setupServer(
    http.post(
        "*/api/battles",
        () =>
            new HttpResponse(
                textStream([
                    "Salamèche crache du feu.\n",
                    "VAINQUEUR: Salamèche",
                ]),
                { headers: { "Content-Type": "text/plain; charset=utf-8" } },
            ),
    ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("useBattle", () => {
    it("goes from idle to done with the narration and the winner", async () => {
        const { result } = renderHook(() => useBattle(fighters));
        expect(result.current.status).toBe("idle");

        act(() => void result.current.start());
        expect(result.current.status).toBe("connecting");

        await waitFor(() => expect(result.current.status).toBe("done"));
        expect(result.current.narration.text).toBe("Salamèche crache du feu.");
        expect(result.current.narration.winnerName).toBe("Salamèche");
        expect(result.current.error).toBeUndefined();
    });

    it("stores a BattleError when the backend refuses the battle", async () => {
        server.use(
            http.post("*/api/battles", () =>
                HttpResponse.json(
                    {
                        code: "ERR_CHATBOT_RATE_LIMITED",
                        message: "Rate limited",
                        value: null,
                    },
                    { status: 429, headers: { "Retry-After": "5" } },
                ),
            ),
        );
        const { result } = renderHook(() => useBattle(fighters));

        act(() => void result.current.start());

        await waitFor(() => expect(result.current.status).toBe("error"));
        expect(result.current.error?.status).toBe(429);
        expect(result.current.error?.retryAfterSeconds).toBe(5);
    });

    it("cancels a running battle and aborts the request", async () => {
        let requestSignal: AbortSignal | undefined;
        server.use(
            http.post("*/api/battles", ({ request }) => {
                requestSignal = request.signal;
                return new HttpResponse(pendingStream(["Le combat commence"]), {
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                });
            }),
        );
        const { result } = renderHook(() => useBattle(fighters));

        act(() => void result.current.start());
        await waitFor(() => expect(result.current.status).toBe("streaming"));
        expect(result.current.narration.text).toBe("Le combat commence");

        act(() => result.current.cancel());

        expect(result.current.status).toBe("idle");
        expect(result.current.narration.text).toBe("");
        await waitFor(() => expect(requestSignal?.aborted).toBe(true));
        expect(result.current.error).toBeUndefined();
    });

    it("aborts the request when unmounted", async () => {
        let requestSignal: AbortSignal | undefined;
        server.use(
            http.post("*/api/battles", ({ request }) => {
                requestSignal = request.signal;
                return new HttpResponse(pendingStream(["..."]), {
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                });
            }),
        );
        const { result, unmount } = renderHook(() => useBattle(fighters));

        act(() => void result.current.start());
        await waitFor(() => expect(result.current.status).toBe("streaming"));
        unmount();

        await waitFor(() => expect(requestSignal?.aborted).toBe(true));
    });
});
