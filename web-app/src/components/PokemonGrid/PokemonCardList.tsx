import type { Pokemon } from "../../entities/Pokemon";
import { CardStyles } from "./CardStyles";
import { PokemonCard } from "./PokemonCard";

interface PokemonCardListProps {
    pokemons: Pokemon[];
}

export function PokemonCardList({ pokemons }: PokemonCardListProps) {
    return (
        <ul className={CardStyles.GRID}>
            {pokemons.map(pokemon => (
                <li key={pokemon.id}>
                    <PokemonCard pokemon={pokemon} />
                </li>
            ))}
        </ul>
    );
}
