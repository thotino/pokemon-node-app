import { INDEX_PREFIX, LATEST_ALIAS, PREVIOUS_ALIAS } from "../constants";
import { logger } from "../logger";
import PokeIndexRepository from "../repositories/PokeIndexRepository";
import {
    AliasAction,
    IndexWithAliases,
    RotationPlan,
} from "../types/index-alias";

export default class AliasRotationService {
    static #indexTimestamp(indexName: string) {
        const timestamp = Number(indexName.slice(INDEX_PREFIX.length));
        return Number.isFinite(timestamp) ? timestamp : -1;
    }
    static #mostRecent(indexNames: string[]) {
        return indexNames.reduce<string | null>(
            (latest, name) =>
                latest === null ||
                AliasRotationService.#indexTimestamp(name) >
                    AliasRotationService.#indexTimestamp(latest)
                    ? name
                    : latest,
            null,
        );
    }
    static #holdersOf(indices: IndexWithAliases[], alias: string) {
        return indices
            .filter(index => index.aliases.includes(alias))
            .map(index => index.name);
    }
    static #buildPlan(
        indices: IndexWithAliases[],
        newIndex: string,
    ): RotationPlan {
        const latestHolders = AliasRotationService.#holdersOf(
            indices,
            LATEST_ALIAS,
        ).filter(name => name !== newIndex);
        const previousHolders = AliasRotationService.#holdersOf(
            indices,
            PREVIOUS_ALIAS,
        );
        const previous = AliasRotationService.#mostRecent(latestHolders);
        const actions: AliasAction[] = [
            ...latestHolders.map(index => ({
                remove: { index, alias: LATEST_ALIAS },
            })),
            ...previousHolders.map(index => ({
                remove: { index, alias: PREVIOUS_ALIAS },
            })),
            { add: { index: newIndex, alias: LATEST_ALIAS } },
            ...(previous === null
                ? []
                : [{ add: { index: previous, alias: PREVIOUS_ALIAS } }]),
        ];
        const kept = new Set([newIndex, previous]);
        const toDelete = indices
            .map(index => index.name)
            .filter(name => !kept.has(name));
        return { actions, previous, toDelete };
    }
    static async rotate(newIndex: string) {
        const indices = await PokeIndexRepository.getIndicesWithAliases(
            `${INDEX_PREFIX}*`,
        );
        const { actions, previous, toDelete } = AliasRotationService.#buildPlan(
            indices,
            newIndex,
        );
        await PokeIndexRepository.swapAliases(actions);
        logger.info("Aliases rotated", { latest: newIndex, previous });
        try {
            await PokeIndexRepository.deleteIndices(toDelete);
            if (toDelete.length > 0) {
                logger.info("Old indices deleted", { indices: toDelete });
            }
        } catch (error) {
            logger.warn("Old indices deletion failed", {
                indices: toDelete,
                error,
            });
        }
    }
}
