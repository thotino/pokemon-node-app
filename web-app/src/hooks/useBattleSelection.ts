import { createContext, useContext } from "react";
import type { BattleSelection } from "../types/battle";

export const BattleSelectionContext = createContext<
    BattleSelection | undefined
>(undefined);

export function useBattleSelection(): BattleSelection {
    const selection = useContext(BattleSelectionContext);
    if (selection == null) {
        throw new Error(
            "useBattleSelection must be used within a BattleSelectionProvider",
        );
    }
    return selection;
}
