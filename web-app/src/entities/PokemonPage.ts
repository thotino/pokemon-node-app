import type { IPokemonPage } from "../types/pokemon";
import { Pokemon } from "./Pokemon";
import { PokemonTypeFacet } from "./PokemonTypeFacet";

export class PokemonPage implements IPokemonPage {
    readonly from: number;
    readonly size: number;
    readonly total: number;
    readonly items: Pokemon[];
    readonly filters: PokemonTypeFacet[];

    constructor(data: IPokemonPage) {
        this.from = data.from;
        this.size = data.size;
        this.total = data.total;
        this.items = data.items.map(item => new Pokemon(item));
        this.filters = (data.filters ?? []).map(
            facet => new PokemonTypeFacet(facet),
        );
    }

    get page(): number {
        return Math.floor(this.from / this.size) + 1;
    }

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.total / this.size));
    }
}
