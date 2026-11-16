import PokeIndexRepository from "../repositories/PokeIndexRepository";
import PokeRepository from "../repositories/PokeRepository";
import { batchify } from "../utils/batchify";
import mapping from "./mapping";
import settings from "./settings";

export default class PokeIndexationService {
    static async exec() {
        const indexName = `pokenode_${Date.now()}`;
        // await PokeIndexRepository.createIndex(indexName);
        await PokeIndexRepository.updateIndexWithMeta(indexName, {
            mapping,
            settings,
        });
        const pokemonGen = PokeRepository.getPokemons();
        for await (const pokemonBatch of pokemonGen) {
            await PokeIndexRepository.bulkIndex(indexName, pokemonBatch);
        }
        await PokeIndexRepository.flushIndex(indexName);
    }
}
