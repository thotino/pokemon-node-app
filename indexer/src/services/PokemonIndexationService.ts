import PokeIndexRepository from "../repositories/PokeIndexRepository";
import PokeRepository from "../repositories/PokeRepository";
import mapping from "./mapping";
import settings from "./settings";
const INDEX_ALIAS = "latest_pokenode";
export default class PokeIndexationService {
    static async exec() {
        const indexName = `pokenode_${Date.now()}`;
        await PokeIndexRepository.updateIndexWithMeta(indexName, {
            mapping,
            settings,
        });
        const pokemonGen = PokeRepository.getPokemons();
        for await (const pokemonBatch of pokemonGen) {
            await PokeIndexRepository.bulkIndex(indexName, pokemonBatch);
        }
        await PokeIndexRepository.flushIndex(indexName);
        await PokeIndexRepository.setAlias(indexName, INDEX_ALIAS);
    }
}
