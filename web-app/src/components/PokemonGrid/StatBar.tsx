import type { PokemonStat } from "../../entities/PokemonStat";

interface StatBarProps {
    stat: PokemonStat;
}

export function StatBar({ stat }: StatBarProps) {
    return (
        <div className="grid grid-cols-[4.5rem_2rem_1fr] items-center gap-2 text-sm">
            <dt className="text-slate-600 dark:text-slate-300">{stat.label}</dt>
            <dd className="text-right font-semibold tabular-nums">
                {stat.value}
            </dd>
            <dd
                aria-hidden="true"
                className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            >
                <div
                    className="h-full rounded-full bg-amber-400 dark:bg-amber-300"
                    style={{ width: `${stat.percent}%` }}
                />
            </dd>
        </div>
    );
}
