import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { PokemonApiRepository } from "../../repositories/PokemonApiRepository";
import { SearchParamService } from "../../services/SearchParamService";
import { usePageParam } from "../../hooks/usePageParam";
import { usePokemons } from "../../hooks/usePokemons";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useSearchCriteria } from "../../hooks/useSearchCriteria";
import { Pagination } from "../Pagination";
import { CardSkeleton } from "./CardSkeleton";
import { CardStyles } from "./CardStyles";
import { PokemonCardList } from "./PokemonCardList";
import { PokemonToolbar } from "./PokemonToolbar";

interface PokemonGridProps {
    size?: number;
}

const ACTION_BUTTON_CLASSES =
    "rounded-full bg-amber-400 px-5 py-2 font-semibold text-slate-900 shadow hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:opacity-60";

function StatusMessage({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-4 py-16 text-center text-lg text-slate-700 dark:text-slate-200">
            {children}
        </div>
    );
}

export function PokemonGrid({
    size = PokemonApiRepository.DEFAULT_PAGE_SIZE,
}: PokemonGridProps) {
    const [page, setPage] = usePageParam();
    const [criteria, setCriteria] = useSearchCriteria();
    const { data, isPending, isError, isFetching, isPlaceholderData, refetch } =
        usePokemons(page, size, criteria);
    const totalPages = data?.totalPages;
    const isFiltered = SearchParamService.isActive(criteria);
    const sectionRef = useRef<HTMLElement>(null);
    const reduceMotion = usePrefersReducedMotion();

    const handlePageChange = useCallback(
        (nextPage: number) => {
            setPage(nextPage);
            window.scrollTo({
                top: 0,
                behavior: reduceMotion ? "auto" : "smooth",
            });
            sectionRef.current?.focus({ preventScroll: true });
        },
        [setPage, reduceMotion],
    );

    const handleSearch = useCallback(
        (q: string) => setCriteria({ ...criteria, q }),
        [criteria, setCriteria],
    );

    const handleToggleType = useCallback(
        (type: string) =>
            setCriteria(SearchParamService.toggleType(criteria, type)),
        [criteria, setCriteria],
    );

    const handleReset = useCallback(
        () => setCriteria(SearchParamService.EMPTY),
        [setCriteria],
    );

    useEffect(() => {
        if (
            totalPages !== undefined &&
            !isPlaceholderData &&
            page > totalPages
        ) {
            setPage(totalPages, { replace: true });
        }
    }, [page, totalPages, isPlaceholderData, setPage]);

    const toolbar = (
        <PokemonToolbar
            criteria={criteria}
            facets={data?.filters ?? []}
            total={isError ? undefined : data?.total}
            isLoading={isPending}
            isFiltered={isFiltered}
            onSearch={handleSearch}
            onToggleType={handleToggleType}
            onReset={handleReset}
        />
    );

    if (isPending) {
        return (
            <div className="w-full">
                {toolbar}
                <section
                    aria-label="Pokémon"
                    aria-busy="true"
                    className="w-full px-4 py-6"
                >
                    <ul className={CardStyles.GRID}>
                        {Array.from({ length: size }, (_, index) => (
                            <li key={index}>
                                <CardSkeleton />
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="w-full">
                {toolbar}
                <StatusMessage>
                    <p role="alert">Unable to load Pokémon.</p>
                    <button
                        type="button"
                        onClick={() => void refetch()}
                        disabled={isFetching}
                        className={ACTION_BUTTON_CLASSES}
                    >
                        {isFetching ? "Retrying…" : "Retry"}
                    </button>
                </StatusMessage>
            </div>
        );
    }

    if (data.items.length === 0) {
        return (
            <div className="w-full">
                {toolbar}
                <StatusMessage>
                    <p>No Pokemon found.</p>
                    {isFiltered && (
                        <button
                            type="button"
                            onClick={handleReset}
                            className={ACTION_BUTTON_CLASSES}
                        >
                            Clear search and filters
                        </button>
                    )}
                </StatusMessage>
            </div>
        );
    }

    return (
        <div className="w-full">
            {toolbar}
            <section
                ref={sectionRef}
                tabIndex={-1}
                aria-label="Pokémon"
                aria-busy={isPlaceholderData}
                className={`w-full px-4 py-6 transition-opacity focus:outline-none ${isPlaceholderData ? "opacity-60" : ""}`}
            >
                <PokemonCardList pokemons={data.items} />
            </section>
            <Pagination
                page={page}
                totalPages={data.totalPages}
                onPageChange={handlePageChange}
            />
        </div>
    );
}
