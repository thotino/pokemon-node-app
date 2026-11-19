import type { Pokemon } from "../../entities/Pokemon";
import { CardStyles } from "./CardStyles";
import { PokemonCard } from "./PokemonCard";

interface PokemonCardListProps {
    pokemons: Pokemon[];
    isSelected?: (pokemon: Pokemon) => boolean;
    canSelect?: boolean;
    onToggleSelect?: (pokemon: Pokemon) => void;
}

export function PokemonCardList({
    pokemons,
    isSelected,
    canSelect,
    onToggleSelect,
}: PokemonCardListProps) {
    return (
        <ul className={CardStyles.GRID}>
            {pokemons.map(pokemon => (
                <li key={pokemon.id}>
                    <PokemonCard
                        pokemon={pokemon}
                        isSelected={isSelected?.(pokemon)}
                        canSelect={canSelect}
                        onToggleSelect={onToggleSelect}
                    />
                </li>
            ))}
        </ul>
    );
}
