import { describe, expect, it } from "vitest";
import ElasticsearchPokemonSearchQueryBuilder from "../ElasticsearchPokemonSearchQueryBuilder";

describe("ElasticsearchPokemonSearchQueryBuilder", () => {
    describe("build", () => {
        it("builds a match_all query sorted by id without post_filter when no keywords nor types are given", () => {
            const searchRequest = ElasticsearchPokemonSearchQueryBuilder.build({
                from: 0,
                size: 20,
            });

            expect(searchRequest).toEqual({
                _source: [
                    "id",
                    "pokedexId",
                    "name",
                    "image",
                    "sprite",
                    "stats",
                    "apiTypes",
                ],
                from: 0,
                size: 20,
                query: { match_all: {} },
                aggs: {
                    types: {
                        terms: { field: "apiTypes.name", size: 30 },
                    },
                },
                sort: [{ id: "asc" }],
            });
            expect(searchRequest).not.toHaveProperty("post_filter");
        });

        it("builds a fuzzy and autocomplete query sorted by score then id when keywords are given", () => {
            const searchRequest = ElasticsearchPokemonSearchQueryBuilder.build({
                from: 0,
                size: 20,
                keywords: "pika",
            });

            expect(searchRequest.query).toEqual({
                bool: {
                    should: [
                        {
                            match: {
                                name: {
                                    query: "pika",
                                    fuzziness: "AUTO",
                                    prefix_length: 1,
                                    boost: 2,
                                },
                            },
                        },
                        { match: { "name.autocomplete": "pika" } },
                    ],
                    minimum_should_match: 1,
                },
            });
            expect(searchRequest.sort).toEqual([
                { _score: "desc" },
                { id: "asc" },
            ]);
        });

        it.each([
            {
                types: ["fire", "water"],
                expectedPostFilter: {
                    terms: { "apiTypes.name": ["fire", "water"] },
                },
            },
            { types: [], expectedPostFilter: undefined },
        ])(
            "builds post_filter $expectedPostFilter when types is $types",
            ({ types, expectedPostFilter }) => {
                const searchRequest =
                    ElasticsearchPokemonSearchQueryBuilder.build({
                        from: 0,
                        size: 20,
                        types,
                    });

                expect(searchRequest.post_filter).toEqual(expectedPostFilter);
                expect(searchRequest.query).toEqual({ match_all: {} });
                expect(searchRequest.aggs).toEqual({
                    types: {
                        terms: { field: "apiTypes.name", size: 30 },
                    },
                });
            },
        );
    });
});
