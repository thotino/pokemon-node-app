import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { PokemonApiRepository } from "../repositories/PokemonApiRepository";
import type { PokemonSearchCriteria } from "../types/pokemon";
import { SearchParamService } from "./SearchParamService";

export class PokemonQueries {
    static readonly ROOT_KEY = "pokemons";

    static pageKey(
        page: number,
        size: number,
        criteria: PokemonSearchCriteria = SearchParamService.EMPTY,
    ) {
        const { q, types } = SearchParamService.normalize(criteria);
        return [
            PokemonQueries.ROOT_KEY,
            "page",
            { page, size, q, types },
        ] as const;
    }

    static page(
        page: number,
        size: number = PokemonApiRepository.DEFAULT_PAGE_SIZE,
        criteria: PokemonSearchCriteria = SearchParamService.EMPTY,
    ) {
        const queryKey = PokemonQueries.pageKey(page, size, criteria);
        const { q, types } = queryKey[2];
        return queryOptions({
            queryKey,
            queryFn: ({ signal }) =>
                PokemonApiRepository.getPage({ page, size, q, types, signal }),
            placeholderData: keepPreviousData,
        });
    }
}
