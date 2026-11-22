import type { JSONSchemaType } from "ajv";
import type { ContentParams } from "../../types/content";
import { POKEMON_ID_PATTERN } from "../../constants";

const contentRequestParamsSchema: JSONSchemaType<ContentParams> = {
    type: "object",
    properties: {
        pokemonId: { type: "string", pattern: POKEMON_ID_PATTERN },
    },
    required: ["pokemonId"],
    additionalProperties: false,
};
export { contentRequestParamsSchema };
