import type { IPokemon, IPokemonTypeFacet } from "../types/pokemon";

export const typeFacets: IPokemonTypeFacet[] = [
    { name: "Plante", count: 12 },
    { name: "Feu", count: 9 },
    { name: "Vol", count: 7 },
];

export const bulbasaur: IPokemon = {
    id: 1,
    pokedexId: 1,
    name: "Bulbizarre",
    image: "https://example.test/1.png",
    sprite: "https://example.test/1-sprite.png",
    slug: "bulbizarre",
    stats: {
        HP: 45,
        attack: 49,
        defense: 49,
        special_attack: 65,
        special_defense: 65,
        speed: 45,
    },
    apiTypes: [{ name: "Plante", image: "https://example.test/plante.png" }],
};
