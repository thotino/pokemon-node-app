import type { StatBlock } from "../types/pokemon";

export class PokemonStat {
    static readonly MAX_VALUE = 255;

    readonly key: keyof StatBlock;
    readonly label: string;
    readonly value: number;

    constructor(key: keyof StatBlock, label: string, value: number) {
        this.key = key;
        this.label = label;
        this.value = value;
    }

    get percent(): number {
        const ratio = (this.value / PokemonStat.MAX_VALUE) * 100;
        return Number.isFinite(ratio)
            ? Math.min(100, Math.max(0, Math.round(ratio)))
            : 0;
    }
}
