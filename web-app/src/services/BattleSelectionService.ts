import { BATTLE_SIZE } from "../constants";
import type { Pokemon } from "../entities/Pokemon";

export class BattleSelectionService {
    static readonly EMPTY: readonly Pokemon[] = [];

    static has(selection: readonly Pokemon[], pokemon: Pokemon): boolean {
        return selection.some(fighter => fighter.id === pokemon.id);
    }

    static isFull(selection: readonly Pokemon[]): boolean {
        return selection.length >= BATTLE_SIZE;
    }

    static canStart(selection: readonly Pokemon[]): boolean {
        return selection.length === BATTLE_SIZE;
    }

    static toggle(
        selection: readonly Pokemon[],
        pokemon: Pokemon,
    ): readonly Pokemon[] {
        if (BattleSelectionService.has(selection, pokemon)) {
            return selection.filter(fighter => fighter.id !== pokemon.id);
        }
        if (BattleSelectionService.isFull(selection)) {
            return selection;
        }
        return [...selection, pokemon];
    }
}
