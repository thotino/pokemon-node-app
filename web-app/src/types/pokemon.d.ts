export interface PokemonType {
    name: string;
    image: string;
}

export interface StatBlock {
    HP: number;
    attack: number;
    defense: number;
    special_attack: number;
    special_defense: number;
    speed: number;
}

export interface IPokemon {
    id: number;
    pokedexId: number;
    name: string;
    image: string;
    sprite: string;
    slug: string;
    stats: StatBlock;
    apiTypes: PokemonType[];
}

export interface IPokemonTypeFacet {
    name: string;
    count: number;
}

export interface IPokemonPage {
    from: number;
    size: number;
    total: number;
    items: IPokemon[];
    filters: IPokemonTypeFacet[];
}

export interface PokemonSearchCriteria {
    q: string;
    types: string[];
}

export interface PokemonSearchResponse {
    pokemons: IPokemonPage;
}
