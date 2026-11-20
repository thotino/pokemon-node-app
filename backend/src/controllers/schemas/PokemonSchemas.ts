import type { JSONSchemaType } from "ajv";
import type { PokemonSearchQuery } from "../../types/search-pokemons";
import type { PokemonIdParams } from "../../types/pokemon";
import {
    DEFAULT_OFFSET,
    DEFAULT_SIZE,
    MAX_KEYWORDS_LENGTH,
    MAX_PAGE_SIZE,
    MAX_POKEMON_TYPES,
    NON_BLANK_TOKEN_PATTERN,
    POKEMON_ID_PATTERN,
} from "../../constants";

export default class PokemonSchemas {
    static readonly searchQuery: JSONSchemaType<PokemonSearchQuery> = {
        type: "object",
        properties: {
            q: {
                type: "string",
                maxLength: MAX_KEYWORDS_LENGTH,
                nullable: true,
            },
            types: {
                type: "array",
                items: { type: "string", pattern: NON_BLANK_TOKEN_PATTERN },
                minItems: 1,
                maxItems: MAX_POKEMON_TYPES,
                uniqueItems: true,
                nullable: true,
            },
            from: { type: "integer", minimum: 0, default: DEFAULT_OFFSET },
            size: {
                type: "integer",
                minimum: 1,
                maximum: MAX_PAGE_SIZE,
                default: DEFAULT_SIZE,
            },
        },
        required: ["from", "size"],
        additionalProperties: false,
    };

    static readonly idParams: JSONSchemaType<PokemonIdParams> = {
        type: "object",
        properties: {
            id: { type: "string", pattern: POKEMON_ID_PATTERN },
        },
        required: ["id"],
        additionalProperties: false,
    };
}
