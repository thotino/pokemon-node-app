import { SearchRequest } from "@elastic/elasticsearch/lib/api/types";
import { PokemonSearchRequest } from "../types/search-pokemons";

export default class ElasticsearchPokemonSearchQueryBuilder {
    static #buildQuery(request: PokemonSearchRequest) {
        if (request.keywords != null) {
            return {
                bool: {
                    should: [
                        {
                            match: {
                                name: {
                                    query: request.keywords,
                                    fuzziness: "AUTO",
                                    prefix_length: 1,
                                    boost: 2,
                                },
                            },
                        },
                        { match: { "name.autocomplete": request.keywords } },
                    ],
                    minimum_should_match: 1,
                },
            };
        }
        return { match_all: {} };
    }
    static #buildPostFilter(request: PokemonSearchRequest) {
        if (Array.isArray(request.types) && request.types.length != 0) {
            return { terms: { "apiTypes.name": request.types } };
        }
    }
    static #buildAggs() {
        return {
            types: {
                terms: { field: "apiTypes.name", size: 30 },
            },
        };
    }
    static #buildSort(request: PokemonSearchRequest) {
        const sortingCriteria: { [k: string]: string }[] = [{ id: "asc" }];
        if (request.keywords != null) {
            sortingCriteria.unshift({ _score: "desc" });
        }
        return sortingCriteria;
    }
    static build(request: PokemonSearchRequest): SearchRequest {
        const postFilterClause =
            ElasticsearchPokemonSearchQueryBuilder.#buildPostFilter(request);
        return {
            _source: [
                "id",
                "pokedexId",
                "name",
                "image",
                "sprite",
                "stats",
                "apiTypes",
            ],
            from: request.from,
            size: request.size,
            query: ElasticsearchPokemonSearchQueryBuilder.#buildQuery(request),
            ...(postFilterClause != null
                ? { post_filter: postFilterClause }
                : {}),
            aggs: ElasticsearchPokemonSearchQueryBuilder.#buildAggs(),
            sort: ElasticsearchPokemonSearchQueryBuilder.#buildSort(request),
        };
    }
}
