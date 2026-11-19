import { INDEX_PREFIX } from "../constants";
import { logger } from "../logger";
import PokeIndexRepository from "../repositories/PokeIndexRepository";
import PokeRepository from "../repositories/PokeRepository";
import AliasRotationService from "./AliasRotationService";
import mapping from "./mapping";
import settings from "./settings";
export default class PokeIndexationService {
    static async #fillIndex(indexName: string) {
        await PokeIndexRepository.createIndexWithMeta(indexName, {
            mapping,
            settings,
        });
        const pokemonGen = PokeRepository.getPokemons();
        for await (const pokemonBatch of pokemonGen) {
            await PokeIndexRepository.bulkIndex(indexName, pokemonBatch);
        }
        await PokeIndexRepository.flushIndex(indexName);
    }
    static async #discardIndex(indexName: string) {
        try {
            await PokeIndexRepository.deleteIndices([indexName]);
        } catch (error) {
            logger.warn("Partial index deletion failed", {
                index: indexName,
                error,
            });
        }
    }
    static async exec() {
        const indexName = `${INDEX_PREFIX}${Date.now()}`;
        try {
            await PokeIndexationService.#fillIndex(indexName);
        } catch (error) {
            await PokeIndexationService.#discardIndex(indexName);
            throw error;
        }
        await AliasRotationService.rotate(indexName);
    }
}
