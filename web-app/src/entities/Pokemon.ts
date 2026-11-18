import type { IPokemon, PokemonType, StatBlock } from "../types/pokemon";
import { PokemonStat } from "./PokemonStat";

export class Pokemon implements IPokemon {
    static readonly MAIN_STATS: ReadonlyArray<
        readonly [keyof StatBlock, string]
    > = [
        ["HP", "HP"],
        ["attack", "Attack"],
        ["defense", "Defense"],
        ["speed", "Speed"],
    ];

    readonly id: number;
    readonly pokedexId: number;
    readonly name: string;
    readonly image: string;
    readonly sprite: string;
    readonly slug: string;
    readonly stats: StatBlock;
    readonly apiTypes: PokemonType[];
    readonly mainStats: PokemonStat[];

    constructor(data: IPokemon) {
        this.id = data.id;
        this.pokedexId = data.pokedexId;
        this.name = data.name;
        this.image = data.image;
        this.sprite = data.sprite;
        this.slug = data.slug;
        this.stats = data.stats;
        this.apiTypes = data.apiTypes ?? [];
        this.mainStats = Pokemon.MAIN_STATS.map(
            ([key, label]) =>
                new PokemonStat(key, label, data.stats?.[key] ?? 0),
        );
    }

    get displayNumber(): string {
        return `#${String(this.pokedexId).padStart(3, "0")}`;
    }
}
