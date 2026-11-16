export default {
    // number_of_shards: 1,
    index: {
        refresh_interval: "60s",
    },
    analysis: {
        filter: {
            name_edge_ngram: {
                type: "edge_ngram",
                min_gram: 2,
                max_gram: 20,
            },
        },
        analyzer: {
            name_autocomplete_index: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "asciifolding", "name_edge_ngram"],
            },
            name_autocomplete_search: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "asciifolding"],
            },
        },
        normalizer: {
            lowercase_normalizer: {
                type: "custom",
                filter: ["lowercase"],
            },
        },
    },
};
