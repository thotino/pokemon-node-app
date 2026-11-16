export default {
    dynamic: "strict",
    properties: {
        id: { type: "integer" },
        pokedexId: { type: "integer" },
        name: {
            type: "text",
            fields: {
                keyword: {
                    type: "keyword",
                    normalizer: "lowercase_normalizer",
                },
                autocomplete: {
                    type: "text",
                    analyzer: "name_autocomplete_index",
                    search_analyzer: "name_autocomplete_search",
                },
            },
        },
        slug: { type: "keyword", normalizer: "lowercase_normalizer" },
        image: { type: "keyword", index: false, doc_values: false },
        sprite: { type: "keyword", index: false, doc_values: false },
        stats: {
            properties: {
                HP: { type: "integer" },
                attack: { type: "integer" },
                defense: { type: "integer" },
                special_attack: { type: "integer" },
                special_defense: { type: "integer" },
                speed: { type: "integer" },
            },
        },
        apiTypes: {
            properties: {
                name: { type: "keyword", normalizer: "lowercase_normalizer" },
                image: { type: "keyword", index: false, doc_values: false },
            },
        },
        apiGeneration: { type: "integer" },
        apiResistances: { type: "object", enabled: false },
        resistanceModifyingAbilitiesForApi: { type: "object", enabled: false },
        apiEvolutions: { type: "object", enabled: false },
        apiPreEvolution: { type: "object", enabled: false },
        apiResistancesWithAbilities: { type: "object", enabled: false },
    },
};
