import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { Readable } from "node:stream";
import { BattleController } from "../BattleController";
import { handleError } from "../middlewares/handleError";
import BattleService from "../../services/BattleService";
import ChatbotRateLimitError from "../../errors/ChatbotRateLimitError";
import ChatbotUnavailableError from "../../errors/ChatbotUnavailableError";
import PokemonNotFoundError from "../../errors/PokemonNotFoundError";

vi.mock("../../services/BattleService");

const app = express();
app.use(express.json());
app.use("/battles", BattleController);
app.use(handleError);

function postBattle(body?: object) {
    const pending = request(app).post("/battles");
    return body == null ? pending : pending.send(body);
}

describe("BattleController", () => {
    it("streams the battle and exposes the session id", async () => {
        vi.mocked(BattleService.startBattle).mockResolvedValue({
            sessionId: "s-1",
            stream: Readable.from(["Pikachu ", "gagne !"]),
        });

        const response = await postBattle({ pokemonIds: ["25", 6] });

        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toBe(
            "text/plain; charset=utf-8",
        );
        expect(response.headers["x-session-id"]).toBe("s-1");
        expect(response.text).toBe("Pikachu gagne !");
        const [battleRequest, signal] = vi.mocked(BattleService.startBattle)
            .mock.calls[0];
        expect(battleRequest).toEqual({ pokemonIds: ["25", "6"] });
        expect(signal).toBeInstanceOf(AbortSignal);
    });

    it("omits the session header when the chatbot sends none", async () => {
        vi.mocked(BattleService.startBattle).mockResolvedValue({
            stream: Readable.from(["ok"]),
        });

        const response = await postBattle({ pokemonIds: ["25", "6"] });

        expect(response.status).toBe(200);
        expect(response.headers).not.toHaveProperty("x-session-id");
    });

    it.each([
        ["no body", undefined],
        ["not an array", { pokemonIds: "25" }],
        ["a single pokemon", { pokemonIds: ["25"] }],
        ["duplicated ids", { pokemonIds: ["25", "25"] }],
        ["empty ids", { pokemonIds: ["25", " "] }],
        ["invalid ids", { pokemonIds: ["25", { id: 6 }] }],
        ["non numeric ids", { pokemonIds: ["25", "pikachu"] }],
        ["float ids", { pokemonIds: ["25", 6.5] }],
        [
            "too many pokemon",
            { pokemonIds: ["1", "2", "3", "4", "5", "6", "7"] },
        ],
    ])("rejects %s with a 400", async (_label, body) => {
        const response = await postBattle(body);

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
            code: "ERR_INVALID_REQUEST",
            value: null,
        });
        expect(response.body.validationErrors).not.toHaveLength(0);
        expect(BattleService.startBattle).not.toHaveBeenCalled();
    });

    it("details the validation errors", async () => {
        const response = await postBattle({ pokemonIds: ["25", "25"] });

        expect(response.body.validationErrors).toEqual([
            {
                location: "body",
                path: "/pokemonIds",
                keyword: "uniqueItems",
                message:
                    "must NOT have duplicate items (items ## 1 and 0 are identical)",
            },
        ]);
    });

    it("answers 404 with the unknown pokemon ids", async () => {
        vi.mocked(BattleService.startBattle).mockRejectedValue(
            new PokemonNotFoundError(["9999"]),
        );

        const response = await postBattle({ pokemonIds: ["25", "9999"] });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            code: "ERR_POKEMON_NOT_FOUND",
            message: "Pokemon not found: 9999",
            value: ["9999"],
        });
    });

    it("answers 429 and relays retry-after when rate limited", async () => {
        vi.mocked(BattleService.startBattle).mockRejectedValue(
            new ChatbotRateLimitError(12),
        );

        const response = await postBattle({ pokemonIds: ["25", "6"] });

        expect(response.status).toBe(429);
        expect(response.headers["retry-after"]).toBe("12");
        expect(response.body).toMatchObject({
            code: "ERR_CHATBOT_RATE_LIMITED",
            value: 12,
        });
    });

    it("answers 502 when the chatbot fails", async () => {
        vi.mocked(BattleService.startBattle).mockRejectedValue(
            new ChatbotUnavailableError(),
        );

        const response = await postBattle({ pokemonIds: ["25", "6"] });

        expect(response.status).toBe(502);
        expect(response.body).toMatchObject({
            code: "ERR_CHATBOT_UNAVAILABLE",
        });
    });

    it("answers 500 on unexpected errors, whatever their status code", async () => {
        vi.mocked(BattleService.startBattle).mockRejectedValue(
            Object.assign(new Error("illegal_argument_exception"), {
                statusCode: 400,
            }),
        );

        const response = await postBattle({ pokemonIds: ["25", "6"] });

        expect(response.status).toBe(500);
        expect(response.body).toMatchObject({ code: "ERR_INTERNAL" });
    });

    it("aborts the chatbot request when the client disconnects", async () => {
        let signal: AbortSignal | undefined;
        vi.mocked(BattleService.startBattle).mockImplementation(
            async (_battleRequest, battleSignal) => {
                signal = battleSignal;
                return { stream: new Readable({ read() {} }) };
            },
        );

        await expect(
            postBattle({ pokemonIds: ["25", "6"] }).timeout(200),
        ).rejects.toThrow(/timeout/i);

        await vi.waitFor(() => expect(signal?.aborted).toBe(true));
    });
});
