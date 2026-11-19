import type { Pokemon } from "../../entities/Pokemon";
import { CardStyles } from "../PokemonGrid/CardStyles";

interface FighterCardProps {
    pokemon: Pokemon;
    isWinner?: boolean;
}

export function FighterCard({ pokemon, isWinner = false }: FighterCardProps) {
    return (
        <article
            aria-labelledby={`fighter-${pokemon.id}-name`}
            className={`${CardStyles.FRAME} w-40 sm:w-48 ${isWinner ? "outline outline-4 outline-orange-500" : ""}`}
        >
            <div className={`${CardStyles.BODY} items-center`}>
                <img
                    src={pokemon.image}
                    alt={pokemon.name}
                    width={160}
                    height={160}
                    className={`${CardStyles.IMAGE} object-contain`}
                />
                <h3
                    id={`fighter-${pokemon.id}-name`}
                    className="font-bold capitalize"
                >
                    {pokemon.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {pokemon.displayNumber}
                </p>
            </div>
        </article>
    );
}
