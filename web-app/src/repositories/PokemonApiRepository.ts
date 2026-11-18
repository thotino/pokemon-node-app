import { PokemonPage } from "../entities/PokemonPage";
import type { PokemonSearchResponse } from "../types/pokemon";
import { pokeBackendConnector } from "../connectors/PokeBackendConnector";

export interface GetPokemonPageParams {
    page: number;
    size?: number;
    q?: string;
    types?: string[];
    signal?: AbortSignal;
}

export class PokemonApiRepository {
    static readonly DEFAULT_PAGE_SIZE = 20;

    static toPositiveInt(value: number, fallback: number): number {
        return Number.isInteger(value) && value >= 1 ? value : fallback;
    }

    static pageToOffset(page: number, size: number): number {
        return (
            (PokemonApiRepository.toPositiveInt(page, 1) - 1) *
            PokemonApiRepository.toPositiveInt(
                size,
                PokemonApiRepository.DEFAULT_PAGE_SIZE,
            )
        );
    }

    static buildSearchParams({
        page,
        size = PokemonApiRepository.DEFAULT_PAGE_SIZE,
        q,
        types = [],
    }: Omit<GetPokemonPageParams, "signal">): URLSearchParams {
        const safeSize = PokemonApiRepository.toPositiveInt(
            size,
            PokemonApiRepository.DEFAULT_PAGE_SIZE,
        );
        const params = new URLSearchParams({
            from: String(PokemonApiRepository.pageToOffset(page, safeSize)),
            size: String(safeSize),
        });
        const keywords = q?.trim();
        if (keywords) {
            params.set("q", keywords);
        }
        types
            .filter(type => type.trim() !== "")
            .forEach(type => params.append("types", type));
        return params;
    }

    static async getPage({
        signal,
        ...params
    }: GetPokemonPageParams): Promise<PokemonPage> {
        const { pokemons } =
            await pokeBackendConnector.get<PokemonSearchResponse>("pokemons", {
                searchParams: PokemonApiRepository.buildSearchParams(params),
                signal,
            });
        return new PokemonPage(pokemons);
    }
}
