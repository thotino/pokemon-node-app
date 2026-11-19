import { useEffect, useState } from "react";
import { useBattle } from "../../hooks/useBattle";
import { useBattleSelection } from "../../hooks/useBattleSelection";
import { BattleService } from "../../services/BattleService";
import { ButtonStyles } from "../ButtonStyles";
import { BattleNarrationView } from "./BattleNarrationView";
import { FighterCard } from "./FighterCard";
import { WinnerBanner } from "./WinnerBanner";

interface BattleArenaProps {
    onBack: () => void;
}

export function BattleArena({ onBack }: BattleArenaProps) {
    const { fighters, canStart } = useBattleSelection();
    const { status, narration, error, start, cancel } = useBattle(fighters);
    const [isRetryBlocked, setRetryBlocked] = useState(false);
    const isRunning = status === "connecting" || status === "streaming";
    const winner =
        status === "done"
            ? BattleService.findWinner(narration, fighters)
            : undefined;

    useEffect(() => {
        const seconds = error?.retryAfterSeconds;
        if (seconds == null || seconds <= 0) {
            setRetryBlocked(false);
            return;
        }
        setRetryBlocked(true);
        const timeoutId = setTimeout(
            () => setRetryBlocked(false),
            seconds * 1000,
        );
        return () => clearTimeout(timeoutId);
    }, [error]);

    const backButton = (
        <button
            type="button"
            onClick={onBack}
            className={ButtonStyles.SECONDARY}
        >
            Back to the Pokédex
        </button>
    );

    if (!canStart) {
        return (
            <section
                aria-labelledby="arena-title"
                className="flex flex-col items-center gap-4 px-4 py-16 text-center text-lg text-slate-700 dark:text-slate-200"
            >
                <h2 id="arena-title" className="text-3xl font-thin">
                    Arena
                </h2>
                <p>Pick 2 Pokémon to start a battle.</p>
                {backButton}
            </section>
        );
    }

    return (
        <section
            aria-labelledby="arena-title"
            className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 text-slate-800 dark:text-slate-100"
        >
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 id="arena-title" className="text-3xl font-thin">
                    Arena
                </h2>
                {backButton}
            </div>

            <div className="flex items-center justify-center gap-4 sm:gap-8">
                <FighterCard
                    pokemon={fighters[0]}
                    isWinner={winner?.id === fighters[0].id}
                />
                <span
                    aria-hidden="true"
                    className="text-3xl font-bold text-orange-500"
                >
                    VS
                </span>
                <FighterCard
                    pokemon={fighters[1]}
                    isWinner={winner?.id === fighters[1].id}
                />
            </div>

            <div className="flex justify-center gap-3">
                {isRunning ? (
                    <button
                        type="button"
                        onClick={cancel}
                        className={ButtonStyles.SECONDARY}
                    >
                        Cancel
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => void start()}
                        disabled={isRetryBlocked}
                        className={ButtonStyles.PRIMARY}
                    >
                        {status === "idle"
                            ? "Start the battle"
                            : status === "error"
                              ? "Retry"
                              : "Fight again"}
                    </button>
                )}
            </div>

            {status === "connecting" && (
                <p className="text-center text-slate-600 dark:text-slate-300">
                    The fighters are entering the arena…
                </p>
            )}

            {error && (
                <p
                    role="alert"
                    className="rounded-2xl bg-red-100 p-4 text-center text-red-800 dark:bg-red-950 dark:text-red-200"
                >
                    {error.userMessage}
                </p>
            )}

            <BattleNarrationView
                text={narration.text}
                isStreaming={status === "streaming"}
            />

            <div role="status">
                {status === "done" && (
                    <WinnerBanner
                        winner={winner}
                        winnerName={narration.winnerName}
                    />
                )}
            </div>
        </section>
    );
}
