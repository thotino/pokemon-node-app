import { type ReactNode, useCallback, useMemo, useState } from "react";
import type { Pokemon } from "../../entities/Pokemon";
import { BattleSelectionContext } from "../../hooks/useBattleSelection";
import { BattleSelectionService } from "../../services/BattleSelectionService";

interface BattleSelectionProviderProps {
    children: ReactNode;
    initialFighters?: readonly Pokemon[];
}

export function BattleSelectionProvider({
    children,
    initialFighters = BattleSelectionService.EMPTY,
}: BattleSelectionProviderProps) {
    const [fighters, setFighters] = useState(initialFighters);

    const toggle = useCallback(
        (pokemon: Pokemon) =>
            setFighters(current =>
                BattleSelectionService.toggle(current, pokemon),
            ),
        [],
    );

    const clear = useCallback(
        () => setFighters(BattleSelectionService.EMPTY),
        [],
    );

    const selection = useMemo(
        () => ({
            fighters,
            isFull: BattleSelectionService.isFull(fighters),
            canStart: BattleSelectionService.canStart(fighters),
            toggle,
            clear,
        }),
        [fighters, toggle, clear],
    );

    return (
        <BattleSelectionContext.Provider value={selection}>
            {children}
        </BattleSelectionContext.Provider>
    );
}
