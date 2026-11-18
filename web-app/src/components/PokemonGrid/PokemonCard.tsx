import { useState } from "react";
import type { Pokemon } from "../../entities/Pokemon";
import { useTilt } from "../../hooks/useTilt";
import { CardStyles } from "./CardStyles";
import { StatBar } from "./StatBar";

interface PokemonCardProps {
    pokemon: Pokemon;
}

export function PokemonCard({ pokemon }: PokemonCardProps) {
    const tilt = useTilt();
    const [imageFailed, setImageFailed] = useState(false);

    return (
        <article
            aria-labelledby={`pokemon-${pokemon.id}-name`}
            className={`${CardStyles.FRAME} will-change-transform hover:outline-dashed hover:outline-orange-400`}
            style={tilt.style}
            onPointerMove={tilt.onPointerMove}
            onPointerLeave={tilt.onPointerLeave}
        >
            <div className={CardStyles.BODY}>
                <header className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h2
                            id={`pokemon-${pokemon.id}-name`}
                            className="truncate font-bold capitalize"
                        >
                            {pokemon.name}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {pokemon.displayNumber}
                        </p>
                    </div>
                    <ul aria-label="Types" className="flex shrink-0 gap-1">
                        {pokemon.apiTypes.map(type => (
                            <li key={type.name}>
                                <img
                                    src={type.image}
                                    alt={type.name}
                                    title={type.name}
                                    width={20}
                                    height={20}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </li>
                        ))}
                    </ul>
                </header>

                {imageFailed ? (
                    <div
                        role="img"
                        aria-label={pokemon.name}
                        className={`${CardStyles.IMAGE} flex items-center justify-center text-4xl text-slate-400`}
                    >
                        ?
                    </div>
                ) : (
                    <img
                        src={pokemon.image}
                        alt={pokemon.name}
                        width={192}
                        height={192}
                        loading="lazy"
                        decoding="async"
                        onError={() => setImageFailed(true)}
                        className={`${CardStyles.IMAGE} object-contain`}
                    />
                )}

                <dl className="mt-auto space-y-1">
                    {pokemon.mainStats.map(stat => (
                        <StatBar key={stat.key} stat={stat} />
                    ))}
                </dl>
            </div>
        </article>
    );
}
