import { describe, expect, it } from "vitest";
import { Pokemon } from "../../entities/Pokemon";
import { bulbasaur, charmander } from "../../test/fixtures";
import { BattleSelectionService } from "../BattleSelectionService";

describe("BattleSelectionService", () => {
    const first = new Pokemon(bulbasaur);
    const second = new Pokemon(charmander);
    const third = new Pokemon({ ...bulbasaur, id: 7, name: "Carapuce" });

    it("adds fighters until the team is full", () => {
        const one = BattleSelectionService.toggle(
            BattleSelectionService.EMPTY,
            first,
        );
        const two = BattleSelectionService.toggle(one, second);

        expect(one).toEqual([first]);
        expect(BattleSelectionService.canStart(one)).toBe(false);
        expect(two).toEqual([first, second]);
        expect(BattleSelectionService.isFull(two)).toBe(true);
        expect(BattleSelectionService.canStart(two)).toBe(true);
        expect(BattleSelectionService.toggle(two, third)).toBe(two);
    });

    it("removes a selected fighter by id", () => {
        const selection = [first, second];

        expect(
            BattleSelectionService.toggle(selection, new Pokemon(bulbasaur)),
        ).toEqual([second]);
        expect(BattleSelectionService.has(selection, second)).toBe(true);
        expect(BattleSelectionService.has(selection, third)).toBe(false);
    });
});
