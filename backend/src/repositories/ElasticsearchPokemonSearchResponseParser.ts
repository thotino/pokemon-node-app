import {
    AggregationsStringTermsAggregate,
    SearchResponse,
    SearchTotalHits,
} from "@elastic/elasticsearch/lib/api/types";
import Pokemon from "../entities/Pokemon";
import PokemonTypeFacet from "../entities/PokemonTypeFacet";
import { IPokemon } from "../types/pokemon";
import {
    PokemonSearchRequest,
    PokemonSearchResponse,
    ITypeBucket,
} from "../types/search-pokemons";
export type PokemonTypeAggregations = {
    types: AggregationsStringTermsAggregate;
};
export default class ElasticsearchPokemonSearchResponseParser {
    static parse(
        request: PokemonSearchRequest,
        response: SearchResponse<IPokemon, PokemonTypeAggregations>,
    ): PokemonSearchResponse {
        return {
            from: request.from,
            size: request.size,
            total: (response.hits.total as SearchTotalHits)?.value ?? 0,
            items: response.hits.hits
                .filter(hit => hit._source != null)
                .map(hit => new Pokemon(hit._source!)),
            filters: ElasticsearchPokemonSearchResponseParser.#parseFilters(
                request,
                response,
            ),
        };
    }
    static #parseFilters(
        request: PokemonSearchRequest,
        response: SearchResponse<IPokemon, PokemonTypeAggregations>,
    ): PokemonTypeFacet[] {
        const buckets = (response.aggregations?.types.buckets ??
            []) as ITypeBucket[];
        const facets = buckets.map(bucket =>
            PokemonTypeFacet.fromBucket(bucket),
        );
        const known = new Set(facets.map(facet => facet.name));
        const missing = [...new Set(request.types ?? [])]
            .filter(type => !known.has(type))
            .map(type => new PokemonTypeFacet(type, 0));
        return [...facets, ...missing];
    }
}
