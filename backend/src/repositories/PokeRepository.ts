import {
    AggregationsStringTermsAggregate,
    SearchRequest,
    SearchResponse,
    SearchTotalHits,
} from "@elastic/elasticsearch/lib/api/types";
import { pokeStoreConnector } from "../connectors";
import Pokemon from "../entities/Pokemon";
import { IPokemon } from "../types/pokemon";
import { ITypeBucket, PokemonSearchRequest, PokemonSearchResponse } from "../types/search-pokemons";
import PokemonTypeFacet from "../entities/PokemonTypeFacet";
type PokemonTypeAggregations = {
    types: AggregationsStringTermsAggregate;
};
const INDEX_NAME = "latest_pokenode";
export default class PokeRepository {
    static async getById(id: string) {
        const result = await pokeStoreConnector.client.get<IPokemon>({
            id,
            index: INDEX_NAME,
        });
        return new Pokemon(result._source!);
    }
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
    static #buildAggs(request: PokemonSearchRequest) {
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
    static #buildSearchQuery(request: PokemonSearchRequest): SearchRequest {
        const postFilterClause = PokeRepository.#buildPostFilter(request);
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
            query: PokeRepository.#buildQuery(request),
            ...(postFilterClause != null
                ? { post_filter: postFilterClause }
                : {}),
            aggs: PokeRepository.#buildAggs(request),
            sort: PokeRepository.#buildSort(request),
        };
    }
    static #parse(
        request: PokemonSearchRequest,
        response: SearchResponse<IPokemon, PokemonTypeAggregations>,
    ) {
        return {
            from: request.from,
            size: request.size,
            total: (response.hits.total as SearchTotalHits)?.value ?? 0,
            items: response.hits.hits
                .filter(hit => hit._source != null)
                .map(hit => new Pokemon(hit._source!)),
            filters: (response.aggregations?.types.buckets as ITypeBucket[]).map((bucket: ITypeBucket) => PokemonTypeFacet.fromBucket(bucket)),
        };
    }
    static async getAll(request: PokemonSearchRequest) {
        const query = PokeRepository.#buildSearchQuery(request);
        const result = await pokeStoreConnector.client.search<
            IPokemon,
            PokemonTypeAggregations
        >({
            index: INDEX_NAME,
            ...query,
        });
        return PokeRepository.#parse(request, result);
    }

    static async *getAllByScrolling(
        indexName: string,
    ): AsyncGenerator<IPokemon> {
        const scrollSize = 200;
        const pokemonGen = pokeStoreConnector.scroll({
            index: indexName,
            body: { _source: true },
            size: scrollSize,
        });
        for await (const pokemon of pokemonGen) {
            yield pokemon._source as IPokemon;
        }
    }
}
