import Pokemon from "../entities/Pokemon";

export type PokemonSearchRequest = {
    keywords: string;
    types?: string[];
    from: number;
    size: number;
};
export type PokemonSearchResponse = {
    from: number;
    size: number;
    items: Pokemon[];
    filters: object[];
};
