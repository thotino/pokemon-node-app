import { describe, expect, it } from "vitest";
import { BattleNarration } from "../BattleNarration";

describe("BattleNarration", () => {
    it("extracts the winner and removes the marker line from the text", () => {
        const narration = new BattleNarration(
            "Tour 1 : Pikachu attaque.\nTour 2 : Salamèche riposte.\nVAINQUEUR: Pikachu\n",
            true,
        );

        expect(narration.winnerName).toBe("Pikachu");
        expect(narration.text).toBe(
            "Tour 1 : Pikachu attaque.\nTour 2 : Salamèche riposte.",
        );
    });

    it.each([
        ["**VAINQUEUR: Salamèche**", "Salamèche"],
        ["vainqueur : Salamèche.", "Salamèche"],
        ["## Vainqueur:   Salamèche !", "Salamèche"],
    ])("reads the marker in %s", (line, expected) => {
        const narration = new BattleNarration(`Combat.\n${line}`, true);

        expect(narration.winnerName).toBe(expected);
        expect(narration.text).toBe("Combat.");
    });

    it("keeps the last marker when there are several", () => {
        const narration = new BattleNarration(
            "VAINQUEUR: Pikachu\nRebondissement !\nVAINQUEUR: Salamèche",
            true,
        );

        expect(narration.winnerName).toBe("Salamèche");
        expect(narration.text).toBe("VAINQUEUR: Pikachu\nRebondissement !");
    });

    it("hides a partial marker while streaming", () => {
        const narration = new BattleNarration("Le combat se termine.\nVAIN");

        expect(narration.text).toBe("Le combat se termine.");
        expect(narration.winnerName).toBeUndefined();
    });

    it("keeps a partial marker once the stream is complete", () => {
        const narration = new BattleNarration("Le combat.\nVAIN", true);

        expect(narration.text).toBe("Le combat.\nVAIN");
    });

    it("has no winner without marker", () => {
        const narration = new BattleNarration("Match nul.", true);

        expect(narration.winnerName).toBeUndefined();
        expect(narration.text).toBe("Match nul.");
    });

    it("has no winner when the marker has no name", () => {
        expect(
            new BattleNarration("VAINQUEUR:", true).winnerName,
        ).toBeUndefined();
    });
});
