import React, { useCallback } from "react";
import { useBattleSelection } from "../hooks/useBattleSelection";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useViewParam } from "../hooks/useViewParam";
import type { AppView } from "../types/battle";
import { BattleArena } from "./Battle/BattleArena";
import { BattleBar } from "./Battle/BattleBar";
import { Header } from "./Header";
import { PokemonGrid } from "./PokemonGrid/PokemonGrid";

const PokemonApp: React.FC = () => {
    const [view, setView] = useViewParam();
    const selection = useBattleSelection();
    const reduceMotion = usePrefersReducedMotion();
    const showBar = view === "grid" && selection.fighters.length > 0;

    const goTo = useCallback(
        (nextView: AppView) => {
            setView(nextView);
            window.scrollTo({
                top: 0,
                behavior: reduceMotion ? "auto" : "smooth",
            });
        },
        [setView, reduceMotion],
    );

    return (
        <div className="flex min-h-screen flex-col items-center bg-amber-50 dark:bg-slate-800">
            <Header />
            <main
                className={`w-full max-w-screen-2xl ${showBar ? "pb-28" : ""}`}
            >
                {view === "battle" ? (
                    <BattleArena onBack={() => goTo("grid")} />
                ) : (
                    <PokemonGrid />
                )}
            </main>
            {showBar && (
                <BattleBar
                    fighters={selection.fighters}
                    canStart={selection.canStart}
                    onRemove={selection.toggle}
                    onClear={selection.clear}
                    onStart={() => goTo("battle")}
                />
            )}
        </div>
    );
};

export default PokemonApp;
