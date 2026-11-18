import { IPokemonTypeFacet, ITypeBucket } from "../types/search-pokemons";

export default class PokemonTypeFacet implements IPokemonTypeFacet {
    readonly name: string;
    readonly count: number;

    constructor(name: string, count: number) {
        this.name = name;
        this.count = count;
    }

    static fromBucket(bucket: ITypeBucket): PokemonTypeFacet {
        return new PokemonTypeFacet(bucket.key, bucket.doc_count);
    }
    toJSON() {
        return {
            name: this.name,
            count: this.count,
        };
    }
}
