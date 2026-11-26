import { pokeStoreConnector } from "../connectors";
import Pokemon from "../entities/Pokemon";
import { IPokemon } from "../types/pokemon";
import { PokemonSearchRequest } from "../types/search-pokemons";
import ElasticsearchPokemonSearchQueryBuilder from "./ElasticsearchPokemonSearchQueryBuilder";
import ElasticsearchPokemonSearchResponseParser, {
    PokemonTypeAggregations,
} from "./ElasticsearchPokemonSearchResponseParser";

const INDEX_NAME = "latest_pokenode";

export default class PokeRepository {
    static async getById(id: string): Promise<Pokemon | null> {
        const result = await pokeStoreConnector.client.get<IPokemon>(
            { id, index: INDEX_NAME },
            { ignore: [404] },
        );
        return result !== null && result.found && result._source != null
            ? new Pokemon(result._source)
            : null;
    }

    static async getAll(request: PokemonSearchRequest) {
        const query = ElasticsearchPokemonSearchQueryBuilder.build(request);
        const result = await pokeStoreConnector.client.search<
            IPokemon,
            PokemonTypeAggregations
        >({
            index: INDEX_NAME,
            ...query,
        });
        return ElasticsearchPokemonSearchResponseParser.parse(request, result);
    }

    static async *getAllByScrolling(
        indexName: string,
    ): AsyncGenerator<IPokemon> {
        const scrollSize = 200;
        const pokemonGen = pokeStoreConnector.scroll({
            index: indexName,
            body: { _source: true },
            size: scrollSize,
        });
        for await (const pokemon of pokemonGen) {
            yield pokemon._source as IPokemon;
        }
    }
}
