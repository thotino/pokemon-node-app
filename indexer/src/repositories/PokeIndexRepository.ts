import { ErrorCause } from "@elastic/elasticsearch/lib/api/types";
import { pokeStoreConnector } from "../connectors/index";
import { AliasAction, IndexWithAliases } from "../types/index-alias";
import { Pokemon } from "../types/pokemon";

export default class PokeIndexRepository {
    static async getIndicesWithAliases(
        pattern: string,
    ): Promise<IndexWithAliases[]> {
        const response = await pokeStoreConnector.client.indices.resolveIndex({
            name: pattern,
            expand_wildcards: "open",
        });
        return response.indices.map(({ name, aliases }) => ({
            name,
            aliases: aliases ?? [],
        }));
    }
    static async swapAliases(actions: AliasAction[]) {
        if (actions.length === 0) {
            return;
        }
        await pokeStoreConnector.client.indices.updateAliases({ actions });
    }
    static async deleteIndices(indexNames: string[]) {
        if (indexNames.length === 0) {
            return;
        }
        await pokeStoreConnector.client.indices.delete({ index: indexNames });
    }
    static async flushIndex(indexName: string) {
        return await pokeStoreConnector.client.indices.flush({
            index: indexName,
        });
    }
    static async createIndexWithMeta(
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
    static #chainESErrors(esError: ErrorCause): Error {
        const message = `[${esError.type}] ${esError.reason}`;
        const cause =
            esError.caused_by != null
                ? PokeIndexRepository.#chainESErrors(esError.caused_by)
                : undefined;
        return new Error(message, { cause });
    }
    static async bulkIndex(indexName: string, documents: Pokemon[]) {
        const response = await pokeStoreConnector.client.bulk({
            index: indexName,
            body: documents.flatMap(doc => [
                { index: { _index: indexName, _id: doc.id } },
                doc,
            ]),
        });
        if (response.errors) {
            const errors = response.items
                .filter(item => item.index?.error != null)
                .map(item =>
                    PokeIndexRepository.#chainESErrors(item.index!.error!),
                );
            throw new AggregateError(errors, "Error in bulk indexing");
        }
        return response;
    }
}
