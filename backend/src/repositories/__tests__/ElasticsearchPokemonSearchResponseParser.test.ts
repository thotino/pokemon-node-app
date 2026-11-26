import { describe, expect, it } from "vitest";
import ElasticsearchPokemonSearchResponseParser from "../ElasticsearchPokemonSearchResponseParser";
import Pokemon from "../../entities/Pokemon";
import PokemonTypeFacet from "../../entities/PokemonTypeFacet";
import { IPokemon } from "../../types/pokemon";

const charmander: IPokemon = {
    id: 4,
    pokedexId: 4,
    name: "Salamèche",
    image: "https://example.com/images/4.png",
    sprite: "https://example.com/sprites/4.png",
    slug: "salameche",
    stats: {
        HP: 39,
        attack: 52,
        defense: 43,
        special_attack: 60,
        special_defense: 50,
        speed: 65,
    },
    apiTypes: [{ name: "fire", image: "https://example.com/types/fire.png" }],
    apiGeneration: 1,
    apiResistances: [
        { name: "water", damage_multiplier: 2, damage_relation: "vulnerable" },
    ],
    resistanceModifyingAbilitiesForApi: { name: "Brasier", slug: "brasier" },
    apiEvolutions: [{ name: "Reptincel", pokedexId: 5 }],
    apiPreEvolution: "none",
    apiResistancesWithAbilities: [
        { name: "water", damage_multiplier: 2, damage_relation: "vulnerable" },
    ],
};

const squirtle: IPokemon = {
    id: 7,
    pokedexId: 7,
    name: "Carapuce",
    image: "https://example.com/images/7.png",
    sprite: "https://example.com/sprites/7.png",
    slug: "carapuce",
    stats: {
        HP: 44,
        attack: 48,
        defense: 65,
        special_attack: 50,
        special_defense: 64,
        speed: 43,
    },
    apiTypes: [{ name: "water", image: "https://example.com/types/water.png" }],
    apiGeneration: 1,
    apiResistances: [
        { name: "fire", damage_multiplier: 0.5, damage_relation: "resistant" },
    ],
    resistanceModifyingAbilitiesForApi: { name: "Torrent", slug: "torrent" },
    apiEvolutions: [{ name: "Carabaffe", pokedexId: 8 }],
    apiPreEvolution: "none",
    apiResistancesWithAbilities: [
        { name: "fire", damage_multiplier: 0.5, damage_relation: "resistant" },
    ],
};

describe("ElasticsearchPokemonSearchResponseParser", () => {
    describe("parse", () => {
        it("maps pagination, total, pokemons and type facets from a complete response", () => {
            const pokemonSearchResponse =
                ElasticsearchPokemonSearchResponseParser.parse(
                    { from: 0, size: 20 },
                    {
                        took: 3,
                        timed_out: false,
                        _shards: { total: 1, successful: 1, failed: 0 },
                        hits: {
                            total: { value: 2, relation: "eq" },
                            hits: [
                                {
                                    _index: "pokemons",
                                    _id: "4",
                                    _source: charmander,
                                },
                                {
                                    _index: "pokemons",
                                    _id: "7",
                                    _source: squirtle,
                                },
                            ],
                        },
                        aggregations: {
                            types: {
                                buckets: [
                                    { key: "fire", doc_count: 12 },
                                    { key: "water", doc_count: 8 },
                                ],
                            },
                        },
                    },
                );

            expect(pokemonSearchResponse).toEqual({
                from: 0,
                size: 20,
                total: 2,
                items: [new Pokemon(charmander), new Pokemon(squirtle)],
                filters: [
                    new PokemonTypeFacet("fire", 12),
                    new PokemonTypeFacet("water", 8),
                ],
            });
        });

        it("drops hits without _source and defaults total and filters when they are missing", () => {
            const pokemonSearchResponse =
                ElasticsearchPokemonSearchResponseParser.parse(
                    { from: 0, size: 20 },
                    {
                        took: 3,
                        timed_out: false,
                        _shards: { total: 1, successful: 1, failed: 0 },
                        hits: {
                            hits: [
                                {
                                    _index: "pokemons",
                                    _id: "4",
                                    _source: charmander,
                                },
                                { _index: "pokemons", _id: "7" },
                            ],
                        },
                    },
                );

            expect(pokemonSearchResponse.items).toEqual([
                new Pokemon(charmander),
            ]);
            expect(pokemonSearchResponse.total).toBe(0);
            expect(pokemonSearchResponse.filters).toEqual([]);
        });

        it("appends requested types missing from the buckets with a zero count, without duplicates", () => {
            const pokemonSearchResponse =
                ElasticsearchPokemonSearchResponseParser.parse(
                    { from: 0, size: 20, types: ["fire", "ghost", "ghost"] },
                    {
                        took: 3,
                        timed_out: false,
                        _shards: { total: 1, successful: 1, failed: 0 },
                        hits: {
                            total: { value: 0, relation: "eq" },
                            hits: [],
                        },
                        aggregations: {
                            types: {
                                buckets: [
                                    { key: "fire", doc_count: 12 },
                                    { key: "water", doc_count: 8 },
                                ],
                            },
                        },
                    },
                );

            expect(pokemonSearchResponse.filters).toEqual([
                new PokemonTypeFacet("fire", 12),
                new PokemonTypeFacet("water", 8),
                new PokemonTypeFacet("ghost", 0),
            ]);
        });
    });
});
