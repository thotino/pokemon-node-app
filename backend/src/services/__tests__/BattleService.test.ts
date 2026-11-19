import { describe, expect, it, vi } from "vitest";
import { errors } from "@elastic/elasticsearch";
import { Readable } from "node:stream";
import BattleService from "../BattleService";
import PokeService from "../PokeService";
import BattleRepository from "../../repositories/BattleRepository";
import Pokemon from "../../entities/Pokemon";
import PokemonNotFoundError from "../../errors/PokemonNotFoundError";

vi.mock("../../repositories/BattleRepository", () => ({
    default: { query: vi.fn() },
}));
vi.mock("../PokeService", () => ({
    default: { getById: vi.fn() },
}));

const signal = new AbortController().signal;

function notFound() {
    return new errors.ResponseError({
        body: { found: false },
        statusCode: 404,
        headers: {},
        warnings: null,
        meta: {} as never,
    });
}

function mockPokemons(missing: string[] = []) {
    vi.mocked(PokeService.getById).mockImplementation(async id =>
        missing.includes(id)
            ? Promise.reject(notFound())
            : ({ id: Number(id) } as Pokemon),
    );
}

describe("BattleService", () => {
    it("queries the chatbot with a prompt naming the pokemon ids", async () => {
        const result = { sessionId: "s-1", stream: Readable.from(["ok"]) };
        mockPokemons();
        vi.mocked(BattleRepository.query).mockResolvedValue(result);

        await expect(
            BattleService.startBattle({ pokemonIds: ["25", "6"] }, signal),
        ).resolves.toBe(result);

        expect(PokeService.getById).toHaveBeenCalledWith("25");
        expect(PokeService.getById).toHaveBeenCalledWith("6");
        const [prompt, passedSignal, sessionId] = vi.mocked(
            BattleRepository.query,
        ).mock.calls[0];
        expect(prompt).toContain("25, 6");
        expect(passedSignal).toBe(signal);
        expect(sessionId).toBeUndefined();
    });

    it("rejects unknown pokemon without querying the chatbot", async () => {
        mockPokemons(["9999", "8888"]);

        const error = await BattleService.startBattle(
            { pokemonIds: ["9999", "25", "8888"] },
            signal,
        ).catch(error => error);

        expect(error).toBeInstanceOf(PokemonNotFoundError);
        expect(error.value).toEqual(["9999", "8888"]);
        expect(BattleRepository.query).not.toHaveBeenCalled();
    });

    it("propagates store failures other than not found", async () => {
        const failure = new Error("connection refused");
        vi.mocked(PokeService.getById).mockRejectedValue(failure);

        await expect(
            BattleService.startBattle({ pokemonIds: ["25", "6"] }, signal),
        ).rejects.toBe(failure);
        expect(BattleRepository.query).not.toHaveBeenCalled();
    });
});
