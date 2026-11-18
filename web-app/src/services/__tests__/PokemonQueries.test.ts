import { describe, expect, it } from "vitest";
import { PokemonQueries } from "../PokemonQueries";

describe("PokemonQueries.pageKey", () => {
    it("defaults to empty criteria", () => {
        expect(PokemonQueries.pageKey(1, 20)).toEqual([
            "pokemons",
            "page",
            { page: 1, size: 20, q: "", types: [] },
        ]);
    });

    it("shares the cache entry whatever the order or spacing of the criteria", () => {
        expect(
            PokemonQueries.pageKey(2, 20, {
                q: " pika",
                types: ["Vol", "Feu"],
            }),
        ).toEqual(
            PokemonQueries.pageKey(2, 20, { q: "pika", types: ["Feu", "Vol"] }),
        );
    });

    it("separates the cache entries of different criteria", () => {
        expect(
            PokemonQueries.pageKey(1, 20, { q: "", types: ["Feu"] }),
        ).not.toEqual(PokemonQueries.pageKey(1, 20));
    });
});
