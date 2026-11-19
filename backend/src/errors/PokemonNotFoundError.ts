import { ServiceErrorInterface } from "../types/error";

export default class PokemonNotFoundError
    extends Error
    implements ServiceErrorInterface
{
    readonly code = "ERR_POKEMON_NOT_FOUND";
    readonly value: string[];
    constructor(missingIds: string[]) {
        super(`Pokemon not found: ${missingIds.join(", ")}`);
        this.name = "PokemonNotFoundError";
        this.value = missingIds;
    }
}
