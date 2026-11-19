import { BATTLE_SIZE } from "../../constants";
import type { Pokemon } from "../../entities/Pokemon";
import { ButtonStyles } from "../ButtonStyles";

interface BattleBarProps {
    fighters: readonly Pokemon[];
    canStart: boolean;
    onRemove: (pokemon: Pokemon) => void;
    onClear: () => void;
    onStart: () => void;
}

export function BattleBar({
    fighters,
    canStart,
    onRemove,
    onClear,
    onStart,
}: BattleBarProps) {
    const slots = Array.from(
        { length: BATTLE_SIZE },
        (_, index) => fighters[index],
    );

    return (
        <aside
            aria-label="Battle team"
            className="fixed inset-x-0 bottom-0 z-20 border-t border-amber-300 bg-amber-100/95 shadow-lg backdrop-blur dark:border-slate-600 dark:bg-slate-900/95"
        >
            <div className="mx-auto flex max-w-screen-md flex-wrap items-center justify-center gap-4 px-4 py-3 text-slate-800 dark:text-slate-100">
                <ol className="flex items-center gap-3">
                    {slots.map((fighter, index) => (
                        <li
                            key={fighter?.id ?? `empty-${index}`}
                            className="flex items-center gap-2"
                        >
                            {index > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="font-bold text-orange-500"
                                >
                                    VS
                                </span>
                            )}
                            {fighter ? (
                                <span className="flex items-center gap-1 rounded-full bg-white/80 py-1 pl-1 pr-2 dark:bg-slate-800">
                                    <img
                                        src={fighter.sprite}
                                        alt=""
                                        width={32}
                                        height={32}
                                    />
                                    <span className="font-semibold capitalize">
                                        {fighter.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onRemove(fighter)}
                                        aria-label={`Remove ${fighter.name}`}
                                        className="ml-1 rounded-full px-1 text-slate-500 hover:text-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
                                    >
                                        ×
                                    </button>
                                </span>
                            ) : (
                                <span className="rounded-full border-2 border-dashed border-slate-400 px-3 py-1 text-sm text-slate-500 dark:text-slate-400">
                                    Pick a Pokémon
                                </span>
                            )}
                        </li>
                    ))}
                </ol>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClear}
                        className={ButtonStyles.SECONDARY}
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={onStart}
                        disabled={!canStart}
                        className={ButtonStyles.PRIMARY}
                    >
                        Go to the arena
                    </button>
                </div>
            </div>
        </aside>
    );
}
