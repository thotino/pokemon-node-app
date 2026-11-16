import { pokeStoreConnector } from "../connectors/index";
import { Pokemon } from "../types/pokemon";

export default class PokeIndexRepository {
    static async createIndex(indexName: string) {
        return await pokeStoreConnector.client.indices.create({
            index: indexName,
            settings: { number_of_shards: 1 },
        });
    }
    static async flushIndex(indexName: string) {
        return await pokeStoreConnector.client.indices.flush({
            index: indexName,
        });
    }
    static async setAlias(indexName: string, alias: string) {
        await pokeStoreConnector.client.indices.updateAliases({
            actions: [{ add: { index: indexName, alias } }],
        });
    }
    static async updateIndexWithMeta(
        indexName: string,
        { mapping, settings }: { mapping: object; settings: object },
    ) {
        await pokeStoreConnector.client.indices.create({
            index: indexName,
            settings: { number_of_shards: 1 },
        });
        if (settings !== null) {
            await pokeStoreConnector.client.indices.close({ index: indexName });
            await pokeStoreConnector.client.indices.putSettings({
                index: indexName,
                settings,
            });
            await pokeStoreConnector.client.indices.open({ index: indexName });
        }
        if (mapping !== null) {
            await pokeStoreConnector.client.indices.putMapping({
                index: indexName,
                ...mapping,
            });
        }
    }
    static async bulkIndex(indexName: string, documents: Pokemon[]) {
        const response = await pokeStoreConnector.client.bulk({
            index: indexName,
            body: documents.flatMap(doc => [
                { index: { _index: indexName, _id: doc.id } },
                doc,
            ]),
        });
        return response;
    }
}
