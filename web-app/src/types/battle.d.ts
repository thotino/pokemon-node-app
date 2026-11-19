import type { BattleError } from "../entities/BattleError";
import type { BattleNarration } from "../entities/BattleNarration";
import type { Pokemon } from "../entities/Pokemon";

export type AppView = "grid" | "battle";

export type BattleStatus =
    "idle" | "connecting" | "streaming" | "done" | "error";

export interface IBattleState {
    status: BattleStatus;
    narration: BattleNarration;
    error?: BattleError;
}

export interface BattleStart {
    sessionId?: string;
    chunks: AsyncIterable<string>;
}

export interface BattleSelection {
    fighters: readonly Pokemon[];
    isFull: boolean;
    canStart: boolean;
    toggle: (pokemon: Pokemon) => void;
    clear: () => void;
}
