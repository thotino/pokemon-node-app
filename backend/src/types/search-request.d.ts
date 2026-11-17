export type PokemonSearchRequest = {
    keywords?: string;
    types?: string[];
    from?: number;
    size?: number
}