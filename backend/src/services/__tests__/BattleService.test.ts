import { describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import BattleService from "../BattleService";
import PokeService from "../PokeService";
import BattleRepository from "../../repositories/BattleRepository";
import Pokemon from "../../entities/Pokemon";
import PokemonNotFoundError from "../../errors/PokemonNotFoundError";
import { BATTLE_WINNER_LABEL } from "../../constants";

vi.mock("../../repositories/BattleRepository");
vi.mock("../PokeService");

const signal = new AbortController().signal;

describe("BattleService", () => {
    it("queries the chatbot with a prompt naming the pokemons", async () => {
        const result = { sessionId: "s-1", stream: Readable.from(["ok"]) };
        vi.mocked(PokeService.getById)
            .mockResolvedValueOnce({ id: 25, name: "Pikachu" } as Pokemon)
            .mockResolvedValueOnce({ id: 6, name: "Dracaufeu" } as Pokemon);
        vi.mocked(BattleRepository.query).mockResolvedValueOnce(result);

        await expect(
            BattleService.startBattle({ pokemonIds: ["25", "6"] }, signal),
        ).resolves.toBe(result);

        expect(PokeService.getById).toHaveBeenCalledWith("25");
        expect(PokeService.getById).toHaveBeenCalledWith("6");
        const [prompt, passedSignal, sessionId] = vi.mocked(
            BattleRepository.query,
        ).mock.calls[0];
        expect(prompt).toContain("Pikachu (#25), Dracaufeu (#6)");
        expect(prompt).toContain(
            `"${BATTLE_WINNER_LABEL} <nom> (#<identifiant>)"`,
        );
        expect(passedSignal).toBe(signal);
        expect(sessionId).toBeUndefined();
    });

    it("rejects unknown pokemon without querying the chatbot", async () => {
        vi.mocked(PokeService.getById)
            .mockRejectedValueOnce(new PokemonNotFoundError(["9999"]))
            .mockResolvedValueOnce({ id: 25, name: "Pikachu" } as Pokemon)
            .mockRejectedValueOnce(new PokemonNotFoundError(["8888"]));

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
