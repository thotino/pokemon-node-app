import type { PokemonTypeFacet } from "../entities/PokemonTypeFacet";

interface TypeFilterProps {
    facets: PokemonTypeFacet[];
    selected: string[];
    onToggle: (type: string) => void;
    isLoading?: boolean;
}

const CHIP_CLASSES =
    "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm font-semibold capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500";

const IDLE_CLASSES =
    "border-amber-300 bg-white text-slate-700 hover:bg-amber-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-700";

const ACTIVE_CLASSES =
    "border-amber-400 bg-amber-400 text-slate-900 hover:bg-amber-300 dark:border-amber-300 dark:bg-amber-300";

const SKELETON_COUNT = 8;

export function TypeFilter({
    facets,
    selected,
    onToggle,
    isLoading = false,
}: TypeFilterProps) {
    if (facets.length === 0 && isLoading) {
        return (
            <ul
                aria-hidden="true"
                data-testid="type-filter-skeleton"
                className="flex min-h-8 flex-wrap gap-2 motion-safe:animate-pulse"
            >
                {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                    <li
                        key={index}
                        className="h-8 w-20 rounded-full bg-slate-300 dark:bg-slate-700"
                    />
                ))}
            </ul>
        );
    }

    if (facets.length === 0) {
        return null;
    }

    return (
        <ul
            aria-label="Filter by type"
            className="flex min-h-8 flex-wrap gap-2"
        >
            {facets.map(facet => {
                const isActive = selected.includes(facet.name);
                return (
                    <li key={facet.name}>
                        <button
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => onToggle(facet.name)}
                            className={`${CHIP_CLASSES} ${isActive ? ACTIVE_CLASSES : IDLE_CLASSES}`}
                        >
                            {facet.name}{" "}
                            <span className="text-xs font-normal tabular-nums opacity-70">
                                {facet.count}
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
