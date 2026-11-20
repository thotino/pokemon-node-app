import Pokemon from "../entities/Pokemon";
import PokemonTypeFacet from "../entities/PokemonTypeFacet";

export type PokemonSearchQuery = {
    q?: string;
    types?: string[];
    from: number;
    size: number;
};
export type PokemonSearchRequest = {
    keywords?: string;
    types?: string[];
    from: number;
    size: number;
};
export type PokemonSearchResponse = {
    from: number;
    size: number;
    total: number;
    items: Pokemon[];
    filters: PokemonTypeFacet[];
};
export interface IPokemonTypeFacet {
    name: string;
    count: number;
}
export interface ITypeBucket {
    key: string;
    doc_count: number;
}
