import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { PokemonApiRepository } from "../repositories/PokemonApiRepository";
import { PokemonQueries } from "../services/PokemonQueries";
import { SearchParamService } from "../services/SearchParamService";
import type { PokemonSearchCriteria } from "../types/pokemon";

export function usePokemons(
    page: number,
    size: number = PokemonApiRepository.DEFAULT_PAGE_SIZE,
    criteria: PokemonSearchCriteria = SearchParamService.EMPTY,
) {
    const queryClient = useQueryClient();
    const query = useQuery(PokemonQueries.page(page, size, criteria));
    const totalPages = query.data?.totalPages;

    useEffect(() => {
        if (
            totalPages !== undefined &&
            page < totalPages &&
            !query.isPlaceholderData
        ) {
            void queryClient.prefetchQuery(
                PokemonQueries.page(page + 1, size, criteria),
            );
        }
    }, [
        queryClient,
        page,
        size,
        criteria,
        totalPages,
        query.isPlaceholderData,
    ]);

    return query;
}
