import { describe, expect, it } from "vitest";
import { bulbasaur } from "../../test/fixtures";
import { Pokemon } from "../Pokemon";
import { PokemonStat } from "../PokemonStat";

describe("PokemonStat.percent", () => {
    it.each([
        [0, 0],
        [51, 20],
        [255, 100],
        [300, 100],
        [-10, 0],
        [Number.NaN, 0],
    ])("value %s -> %i%%", (value, expected) => {
        expect(new PokemonStat("HP", "HP", value).percent).toBe(expected);
    });
});

describe("Pokemon", () => {
    it("exposes the 4 main stats in display order", () => {
        const pokemon = new Pokemon(bulbasaur);

        expect(pokemon.mainStats.map(stat => [stat.label, stat.value])).toEqual(
            [
                ["HP", 45],
                ["Attack", 49],
                ["Defense", 49],
                ["Speed", 45],
            ],
        );
    });

    it("pads the pokedex number", () => {
        expect(new Pokemon({ ...bulbasaur, pokedexId: 7 }).displayNumber).toBe(
            "#007",
        );
        expect(
            new Pokemon({ ...bulbasaur, pokedexId: 1025 }).displayNumber,
        ).toBe("#1025");
    });
});
