import { WINNER_MARKER } from "../constants";

export class BattleNarration {
    static readonly #LABEL = WINNER_MARKER.replace(/\s*:\s*$/, "");
    static readonly #MARKER_PATTERN = new RegExp(
        `^${BattleNarration.#LABEL}\\s*:(.*)$`,
        "i",
    );

    static readonly EMPTY = new BattleNarration("");

    readonly raw: string;
    readonly isComplete: boolean;
    readonly text: string;
    readonly winnerName?: string;

    constructor(raw: string, isComplete = false) {
        this.raw = raw;
        this.isComplete = isComplete;

        const lines = raw.split(/\r?\n/);
        const markerIndex = BattleNarration.#findMarkerIndex(lines);
        if (markerIndex !== -1) {
            this.winnerName = BattleNarration.#readWinner(lines[markerIndex]);
            lines.splice(markerIndex, 1);
        } else if (
            !isComplete &&
            BattleNarration.#isPartialMarker(lines[lines.length - 1])
        ) {
            lines.pop();
        }
        this.text = lines.join("\n").trimEnd();
    }

    static #findMarkerIndex(lines: string[]): number {
        for (let index = lines.length - 1; index >= 0; index--) {
            if (BattleNarration.#match(lines[index]) != null) {
                return index;
            }
        }
        return -1;
    }

    static #clean(line: string): string {
        return line.replace(/^[\s*_#>]+/, "").trim();
    }

    static #match(line: string): RegExpMatchArray | null {
        return BattleNarration.#clean(line).match(
            BattleNarration.#MARKER_PATTERN,
        );
    }

    static #readWinner(line: string): string | undefined {
        const name = (BattleNarration.#match(line)?.[1] ?? "")
            .replace(/[\s*_.!]+$/, "")
            .trim();
        return name === "" ? undefined : name;
    }

    static #isPartialMarker(line: string): boolean {
        const cleaned = BattleNarration.#clean(line)
            .replace(/\s+/g, "")
            .toUpperCase();
        return cleaned !== "" && WINNER_MARKER.startsWith(cleaned);
    }
}
