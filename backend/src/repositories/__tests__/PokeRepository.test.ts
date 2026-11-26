import { describe, expect, it, vi } from "vitest";
import PokeRepository from "../PokeRepository";
import Pokemon from "../../entities/Pokemon";
import PokemonTypeFacet from "../../entities/PokemonTypeFacet";
import { pokeStoreConnector } from "../../connectors";
import { IPokemon } from "../../types/pokemon";

vi.mock("../../connectors", () => ({
    pokeStoreConnector: {
        client: { get: vi.fn(), search: vi.fn() },
        scroll: vi.fn(),
    },
}));

const pikachu: IPokemon = {
    id: 25,
    pokedexId: 25,
    name: "Pikachu",
    image: "https://example.com/images/25.png",
    sprite: "https://example.com/sprites/25.png",
    slug: "pikachu",
    stats: {
        HP: 35,
        attack: 55,
        defense: 40,
        special_attack: 50,
        special_defense: 50,
        speed: 90,
    },
    apiTypes: [
        { name: "electric", image: "https://example.com/types/electric.png" },
    ],
    apiGeneration: 1,
    apiResistances: [
        {
            name: "ground",
            damage_multiplier: 2,
            damage_relation: "vulnerable",
        },
    ],
    resistanceModifyingAbilitiesForApi: { name: "Statik", slug: "statik" },
    apiEvolutions: [{ name: "Raichu", pokedexId: 26 }],
    apiPreEvolution: "Pichu",
    apiResistancesWithAbilities: [
        {
            name: "ground",
            damage_multiplier: 2,
            damage_relation: "vulnerable",
        },
    ],
};

const raichu: IPokemon = {
    id: 26,
    pokedexId: 26,
    name: "Raichu",
    image: "https://example.com/images/26.png",
    sprite: "https://example.com/sprites/26.png",
    slug: "raichu",
    stats: {
        HP: 60,
        attack: 90,
        defense: 55,
        special_attack: 90,
        special_defense: 80,
        speed: 110,
    },
    apiTypes: [
        { name: "electric", image: "https://example.com/types/electric.png" },
    ],
    apiGeneration: 1,
    apiResistances: [
        {
            name: "ground",
            damage_multiplier: 2,
            damage_relation: "vulnerable",
        },
    ],
    resistanceModifyingAbilitiesForApi: { name: "Statik", slug: "statik" },
    apiEvolutions: [],
    apiPreEvolution: "Pikachu",
    apiResistancesWithAbilities: [
        {
            name: "ground",
            damage_multiplier: 2,
            damage_relation: "vulnerable",
        },
    ],
};

describe("PokeRepository", () => {
    describe("getById", () => {
        it("returns the pokemon from the store", async () => {
            vi.mocked(pokeStoreConnector.client.get).mockResolvedValueOnce({
                found: true,
                _source: { id: 25, name: "Pikachu" },
            } as never);

            const pokemon = await PokeRepository.getById("25");

            expect(pokemon).toBeInstanceOf(Pokemon);
            expect(pokeStoreConnector.client.get).toHaveBeenCalledWith(
                { id: "25", index: "latest_pokenode" },
                { ignore: [404] },
            );
        });

        it("returns null when the pokemon does not exist", async () => {
            vi.mocked(pokeStoreConnector.client.get).mockResolvedValueOnce({
                found: false,
            } as never);

            await expect(PokeRepository.getById("9999")).resolves.toBeNull();
        });

        it("propagates store failures", async () => {
            const failure = new Error("connection refused");
            vi.mocked(pokeStoreConnector.client.get).mockRejectedValueOnce(
                failure,
            );

            await expect(PokeRepository.getById("25")).rejects.toThrow(failure);
        });
    });
    describe("getAll", () => {
        it("sends the built query to the latest_pokenode index", async () => {
            vi.mocked(pokeStoreConnector.client.search).mockResolvedValueOnce({
                hits: { hits: [] },
            } as never);

            await PokeRepository.getAll({
                from: 40,
                size: 20,
                keywords: "pika",
                types: ["electric"],
            });

            expect(
                pokeStoreConnector.client.search,
            ).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({
                    from: 40,
                    size: 20,
                    post_filter: { terms: { "apiTypes.name": ["electric"] } },
                }),
            );
        });

        it("returns the search response parsed from the store result", async () => {
            vi.mocked(pokeStoreConnector.client.search).mockResolvedValueOnce({
                took: 2,
                timed_out: false,
                _shards: { total: 1, successful: 1, failed: 0 },
                hits: {
                    total: { value: 1, relation: "eq" },
                    hits: [
                        {
                            _index: "latest_pokenode",
                            _id: "25",
                            _source: pikachu,
                        },
                    ],
                },
                aggregations: {
                    types: {
                        buckets: [{ key: "electric", doc_count: 9 }],
                    },
                },
            } as never);

            const pokemonSearchResponse = await PokeRepository.getAll({
                from: 40,
                size: 20,
            });

            expect(pokemonSearchResponse).toEqual({
                from: 40,
                size: 20,
                total: 1,
                items: [new Pokemon(pikachu)],
                filters: [new PokemonTypeFacet("electric", 9)],
            });
        });

        it("propagates store failures", async () => {
            const failure = new Error("connection refused");
            vi.mocked(pokeStoreConnector.client.search).mockRejectedValueOnce(
                failure,
            );

            await expect(
                PokeRepository.getAll({ from: 0, size: 20 }),
            ).rejects.toThrow(failure);
        });
    });
    describe("getAllByScrolling", () => {
        it("yields the _source of each scrolled hit in order", async () => {
            vi.mocked(pokeStoreConnector.scroll).mockReturnValueOnce([
                { _index: "pokenode-2026-11-26", _id: "25", _source: pikachu },
                { _index: "pokenode-2026-11-26", _id: "26", _source: raichu },
            ] as never);

            const pokemons: IPokemon[] = [];
            for await (const pokemon of PokeRepository.getAllByScrolling(
                "pokenode-2026-11-26",
            )) {
                pokemons.push(pokemon);
            }

            expect(pokemons).toEqual([pikachu, raichu]);
            expect(pokeStoreConnector.scroll).toHaveBeenCalledExactlyOnceWith({
                index: "pokenode-2026-11-26",
                body: { _source: true },
                size: 200,
            });
        });

        it("propagates failures raised while scrolling", async () => {
            const failure = new Error("scroll context expired");
            vi.mocked(pokeStoreConnector.scroll).mockReturnValueOnce(
                (async function* () {
                    yield {
                        _index: "pokenode-2026-11-26",
                        _id: "25",
                        _source: pikachu,
                    };
                    throw failure;
                })() as never,
            );

            const pokemons = PokeRepository.getAllByScrolling(
                "pokenode-2026-11-26",
            );

            await expect(pokemons.next()).resolves.toEqual({
                value: pikachu,
                done: false,
            });
            await expect(pokemons.next()).rejects.toThrow(failure);
        });
    });
});
