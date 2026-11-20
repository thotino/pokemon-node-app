import { describe, expect, it, vi } from "vitest";
import PokeService from "../PokeService";
import PokeRepository from "../../repositories/PokeRepository";
import Pokemon from "../../entities/Pokemon";
import PokemonNotFoundError from "../../errors/PokemonNotFoundError";

vi.mock("../../repositories/PokeRepository", () => ({
    default: { getById: vi.fn() },
}));

describe("PokeService", () => {
    describe("getById", () => {
        it("returns the pokemon found by the repository", async () => {
            const pokemon = { id: 25 } as Pokemon;
            vi.mocked(PokeRepository.getById).mockResolvedValue(pokemon);

            expect(await PokeService.getById("25")).toBe(pokemon);
        });

        it("throws a PokemonNotFoundError when the repository finds nothing", async () => {
            vi.mocked(PokeRepository.getById).mockResolvedValue(null);

            const error = await PokeService.getById("9999").catch(
                error => error,
            );

            expect(error).toBeInstanceOf(PokemonNotFoundError);
            expect(error.value).toEqual(["9999"]);
        });
    });
});
