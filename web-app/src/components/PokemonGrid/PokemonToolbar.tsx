import type { PokemonTypeFacet } from "../../entities/PokemonTypeFacet";
import type { PokemonSearchCriteria } from "../../types/pokemon";
import { SearchBar } from "../SearchBar";
import { TypeFilter } from "../TypeFilter";

interface PokemonToolbarProps {
    criteria: PokemonSearchCriteria;
    facets: PokemonTypeFacet[];
    total?: number;
    isLoading: boolean;
    isFiltered: boolean;
    onSearch: (q: string) => void;
    onToggleType: (type: string) => void;
    onReset: () => void;
}

export function PokemonToolbar({
    criteria,
    facets,
    total,
    isLoading,
    isFiltered,
    onSearch,
    onToggleType,
    onReset,
}: PokemonToolbarProps) {
    return (
        <div className="flex w-full flex-col gap-3 px-4 pt-6">
            <SearchBar value={criteria.q} onSubmit={onSearch} />
            <TypeFilter
                facets={facets}
                selected={criteria.types}
                onToggle={onToggleType}
                isLoading={isLoading}
            />
            <div className="flex min-h-6 items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <p aria-live="polite">
                    {total === undefined ? "" : `${total} Pokémon`}
                </p>
                {isFiltered && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="font-semibold text-amber-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 dark:text-amber-300"
                    >
                        Reset filters
                    </button>
                )}
            </div>
        </div>
    );
}
