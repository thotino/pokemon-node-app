import type { IPokemonTypeFacet } from "../types/pokemon";

export class PokemonTypeFacet implements IPokemonTypeFacet {
    readonly name: string;
    readonly count: number;

    constructor(data: IPokemonTypeFacet) {
        this.name = data.name;
        this.count = data.count;
    }
}
