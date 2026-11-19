import { useCallback, useEffect, useReducer, useRef } from "react";
import { BattleError } from "../entities/BattleError";
import { BattleNarration } from "../entities/BattleNarration";
import type { Pokemon } from "../entities/Pokemon";
import { BattleService } from "../services/BattleService";
import type { IBattleState } from "../types/battle";

type BattleAction =
    | { type: "start" }
    | { type: "progress"; narration: BattleNarration }
    | { type: "fail"; error: BattleError }
    | { type: "reset" };

const INITIAL_STATE: IBattleState = {
    status: "idle",
    narration: BattleNarration.EMPTY,
};

function reducer(state: IBattleState, action: BattleAction): IBattleState {
    switch (action.type) {
        case "start":
            return { status: "connecting", narration: BattleNarration.EMPTY };
        case "progress":
            return {
                status: action.narration.isComplete ? "done" : "streaming",
                narration: action.narration,
            };
        case "fail":
            return { ...state, status: "error", error: action.error };
        case "reset":
            return INITIAL_STATE;
    }
}

export function useBattle(fighters: readonly Pokemon[]) {
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
    const controllerRef = useRef<AbortController | null>(null);

    const start = useCallback(async () => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        dispatch({ type: "start" });
        try {
            for await (const narration of BattleService.run(
                fighters,
                controller.signal,
            )) {
                if (controller.signal.aborted) {
                    return;
                }
                dispatch({ type: "progress", narration });
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                dispatch({ type: "fail", error: BattleError.from(error) });
            }
        } finally {
            if (controllerRef.current === controller) {
                controllerRef.current = null;
            }
        }
    }, [fighters]);

    const cancel = useCallback(() => {
        controllerRef.current?.abort();
        controllerRef.current = null;
        dispatch({ type: "reset" });
    }, []);

    useEffect(() => () => controllerRef.current?.abort(), []);

    return { ...state, start, cancel };
}
