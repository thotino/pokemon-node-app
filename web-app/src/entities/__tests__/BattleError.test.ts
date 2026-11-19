import { describe, expect, it } from "vitest";
import { BattleError } from "../BattleError";

describe("BattleError", () => {
    it("lists the missing ids on a 404", () => {
        const error = new BattleError("ERR_POKEMON_NOT_FOUND", {
            status: 404,
            value: ["25", 6],
        });

        expect(error.missingIds).toEqual(["25", "6"]);
        expect(error.userMessage).toBe("Pokémon not found: 25, 6.");
    });

    it("gives the delay on a 429", () => {
        expect(
            new BattleError("ERR_CHATBOT_RATE_LIMITED", {
                status: 429,
                retryAfterSeconds: 12,
            }).userMessage,
        ).toBe("The arena is busy, try again in 12 s.");
        expect(
            new BattleError("ERR_CHATBOT_RATE_LIMITED", { status: 429 })
                .userMessage,
        ).toBe("The arena is busy, try again later.");
    });

    it.each([
        [
            new BattleError(BattleError.STREAM_INTERRUPTED),
            "The battle was interrupted.",
        ],
        [
            new BattleError("ERR_CHATBOT_UNAVAILABLE", { status: 502 }),
            "The battle could not take place.",
        ],
        [
            new BattleError(BattleError.NETWORK),
            "The battle could not take place.",
        ],
    ])("maps %s to a user message", (error, expected) => {
        expect(error.userMessage).toBe(expected);
    });

    it("wraps unknown errors and keeps battle errors", () => {
        const cause = new Error("boom");
        const wrapped = BattleError.from(cause);
        const battleError = new BattleError(BattleError.NETWORK);

        expect(wrapped.code).toBe(BattleError.UNKNOWN);
        expect(wrapped.cause).toBe(cause);
        expect(BattleError.from(battleError)).toBe(battleError);
    });
});
