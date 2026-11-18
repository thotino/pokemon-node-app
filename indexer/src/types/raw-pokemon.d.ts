interface ApiPokemon {
    id: number;
    name: string;
    sprites: {
        front_default: string | null;
        other: { "official-artwork": { front_default: string | null } };
    };
    stats: { base_stat: number; stat: NamedResource }[];
    types: { slot: number; type: NamedResource }[];
    abilities: { ability: NamedResource }[];
    species: NamedResource;
}

interface ApiType {
    name: string;
    damage_relations: {
        double_damage_from: NamedResource[];
        half_damage_from: NamedResource[];
        no_damage_from: NamedResource[];
    };
    sprites: {
        "generation-viii": { "sword-shield": { name_icon: string | null } };
    };
}

interface ApiSpecies {
    name: string;
    generation: NamedResource;
    evolves_from_species: NamedResource | null;
    evolution_chain: { url: string };
}

interface ApiChainLink {
    species: NamedResource;
    evolves_to: ApiChainLink[];
}

interface ApiEvolutionChain {
    chain: ApiChainLink;
}
