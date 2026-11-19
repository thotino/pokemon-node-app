import { beforeEach, describe, expect, it, vi } from "vitest";
import PokeIndexationService from "../PokemonIndexationService";
import AliasRotationService from "../AliasRotationService";
import PokeIndexRepository from "../../repositories/PokeIndexRepository";
import PokeRepository from "../../repositories/PokeRepository";
import { logger } from "../../logger";
import { Pokemon } from "../../types/pokemon";
import mapping from "../mapping";
import settings from "../settings";

vi.mock("../../repositories/PokeIndexRepository", () => ({
    default: {
        createIndexWithMeta: vi.fn(),
        bulkIndex: vi.fn(),
        flushIndex: vi.fn(),
        deleteIndices: vi.fn(),
    },
}));

vi.mock("../../repositories/PokeRepository", () => ({
    default: { getPokemons: vi.fn() },
}));

vi.mock("../AliasRotationService", () => ({
    default: { rotate: vi.fn() },
}));

vi.mock("../../logger", () => ({
    logger: { info: vi.fn(), warn: vi.fn() },
}));

const NOW = 1_700_000_000_000;
const INDEX_NAME = `pokenode_${NOW}`;
const BATCH = [{ id: 1 }] as unknown as Pokemon[];

function givenPokemonBatches(...batches: Pokemon[][]) {
    vi.mocked(PokeRepository.getPokemons).mockImplementation(
        async function* () {
            yield* batches;
        } as typeof PokeRepository.getPokemons,
    );
}

describe("PokeIndexationService.exec", () => {
    beforeEach(() => {
        vi.spyOn(Date, "now").mockReturnValue(NOW);
    });

    it("fills a new index then rotates the aliases onto it", async () => {
        givenPokemonBatches(BATCH, BATCH);
        const calls: string[] = [];
        vi.mocked(PokeIndexRepository.flushIndex).mockImplementation(
            async () => {
                calls.push("flush");
                return {} as Awaited<
                    ReturnType<typeof PokeIndexRepository.flushIndex>
                >;
            },
        );
        vi.mocked(AliasRotationService.rotate).mockImplementation(async () => {
            calls.push("rotate");
        });

        await PokeIndexationService.exec();

        expect(PokeIndexRepository.createIndexWithMeta).toHaveBeenCalledWith(
            INDEX_NAME,
            expect.any(Object),
        );
        expect(PokeIndexRepository.bulkIndex).toHaveBeenCalledTimes(2);
        expect(AliasRotationService.rotate).toHaveBeenCalledWith(INDEX_NAME);
        expect(calls).toEqual(["flush", "rotate"]);
        expect(PokeIndexRepository.deleteIndices).not.toHaveBeenCalled();
    });

    it("deletes the new index and does not rotate when indexing fails", async () => {
        givenPokemonBatches(BATCH);
        vi.mocked(PokeIndexRepository.bulkIndex).mockRejectedValue(
            new Error("bulk failed"),
        );

        await expect(PokeIndexationService.exec()).rejects.toThrow(
            "bulk failed",
        );
        expect(PokeIndexRepository.deleteIndices).toHaveBeenCalledWith([
            INDEX_NAME,
        ]);
        expect(AliasRotationService.rotate).not.toHaveBeenCalled();
    });

    it("keeps the original error when the cleanup also fails", async () => {
        vi.mocked(PokeIndexRepository.createIndexWithMeta).mockRejectedValue(
            new Error("create failed"),
        );
        vi.mocked(PokeIndexRepository.deleteIndices).mockRejectedValue(
            new Error("delete failed"),
        );

        await expect(PokeIndexationService.exec()).rejects.toThrow(
            "create failed",
        );
        expect(logger.warn).toHaveBeenCalledOnce();
        expect(AliasRotationService.rotate).not.toHaveBeenCalled();
    });

    it("creates the index with the mapping and the settings", async () => {
        givenPokemonBatches();

        await PokeIndexationService.exec();

        expect(PokeIndexRepository.createIndexWithMeta).toHaveBeenCalledWith(
            INDEX_NAME,
            { mapping, settings },
        );
    });

    it("flushes and rotates an empty index when there is no pokemon", async () => {
        givenPokemonBatches();

        await PokeIndexationService.exec();

        expect(PokeIndexRepository.bulkIndex).not.toHaveBeenCalled();
        expect(PokeIndexRepository.flushIndex).toHaveBeenCalledWith(INDEX_NAME);
        expect(AliasRotationService.rotate).toHaveBeenCalledWith(INDEX_NAME);
    });

    it("deletes the new index and does not rotate when the flush fails", async () => {
        givenPokemonBatches(BATCH);
        vi.mocked(PokeIndexRepository.flushIndex).mockRejectedValue(
            new Error("flush failed"),
        );

        await expect(PokeIndexationService.exec()).rejects.toThrow(
            "flush failed",
        );
        expect(PokeIndexRepository.deleteIndices).toHaveBeenCalledWith([
            INDEX_NAME,
        ]);
        expect(AliasRotationService.rotate).not.toHaveBeenCalled();
    });

    it("keeps the new index when the rotation fails", async () => {
        givenPokemonBatches(BATCH);
        vi.mocked(AliasRotationService.rotate).mockRejectedValue(
            new Error("rotate failed"),
        );

        await expect(PokeIndexationService.exec()).rejects.toThrow(
            "rotate failed",
        );
        expect(PokeIndexRepository.deleteIndices).not.toHaveBeenCalled();
    });
});
