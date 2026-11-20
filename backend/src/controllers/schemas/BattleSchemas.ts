import type { JSONSchemaType } from "ajv";
import type { BattleRequest } from "../../types/battle";
import {
    MAX_FIGHTERS,
    MIN_FIGHTERS,
    POKEMON_ID_PATTERN,
} from "../../constants";

export default class BattleSchemas {
    static readonly body: JSONSchemaType<BattleRequest> = {
        type: "object",
        properties: {
            pokemonIds: {
                type: "array",
                items: { type: "string", pattern: POKEMON_ID_PATTERN },
                minItems: MIN_FIGHTERS,
                maxItems: MAX_FIGHTERS,
                uniqueItems: true,
            },
        },
        required: ["pokemonIds"],
        additionalProperties: false,
    };
}
