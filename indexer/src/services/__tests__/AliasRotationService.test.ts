import { describe, expect, it, vi } from "vitest";
import AliasRotationService from "../AliasRotationService";
import PokeIndexRepository from "../../repositories/PokeIndexRepository";
import { LATEST_ALIAS, PREVIOUS_ALIAS } from "../../constants";
import { logger } from "../../logger";
import { IndexWithAliases } from "../../types/alias";

vi.mock("../../repositories/PokeIndexRepository", () => ({
    default: {
        getIndicesWithAliases: vi.fn(),
        swapAliases: vi.fn(),
        deleteIndices: vi.fn(),
    },
}));

vi.mock("../../logger", () => ({
    logger: { info: vi.fn(), warn: vi.fn() },
}));

const NEW_INDEX = "pokenode_400";

function givenIndices(indices: IndexWithAliases[]) {
    vi.mocked(PokeIndexRepository.getIndicesWithAliases).mockResolvedValue(
        indices,
    );
}

describe("AliasRotationService.rotate", () => {
    it("only adds the latest alias on the first run", async () => {
        givenIndices([{ name: NEW_INDEX, aliases: [] }]);

        await AliasRotationService.rotate(NEW_INDEX);

        expect(PokeIndexRepository.getIndicesWithAliases).toHaveBeenCalledWith(
            "pokenode_*",
        );
        expect(PokeIndexRepository.swapAliases).toHaveBeenCalledWith([
            { add: { index: NEW_INDEX, alias: LATEST_ALIAS } },
        ]);
        expect(PokeIndexRepository.deleteIndices).toHaveBeenCalledWith([]);
    });

    it("moves latest to previous and deletes the former previous", async () => {
        givenIndices([
            { name: "pokenode_100", aliases: [PREVIOUS_ALIAS] },
            { name: "pokenode_200", aliases: [LATEST_ALIAS] },
            { name: NEW_INDEX, aliases: [] },
        ]);

        await AliasRotationService.rotate(NEW_INDEX);

        expect(PokeIndexRepository.swapAliases).toHaveBeenCalledWith([
            { remove: { index: "pokenode_200", alias: LATEST_ALIAS } },
            { remove: { index: "pokenode_100", alias: PREVIOUS_ALIAS } },
            { add: { index: NEW_INDEX, alias: LATEST_ALIAS } },
            { add: { index: "pokenode_200", alias: PREVIOUS_ALIAS } },
        ]);
        expect(PokeIndexRepository.deleteIndices).toHaveBeenCalledWith([
            "pokenode_100",
        ]);
    });

    it("keeps the most recent index when latest is on several indices", async () => {
        givenIndices([
            { name: "pokenode_100", aliases: [LATEST_ALIAS] },
            { name: "pokenode_300", aliases: [LATEST_ALIAS] },
            { name: "pokenode_200", aliases: [LATEST_ALIAS] },
            { name: NEW_INDEX, aliases: [] },
        ]);

        await AliasRotationService.rotate(NEW_INDEX);

        expect(PokeIndexRepository.swapAliases).toHaveBeenCalledWith([
            { remove: { index: "pokenode_100", alias: LATEST_ALIAS } },
            { remove: { index: "pokenode_300", alias: LATEST_ALIAS } },
            { remove: { index: "pokenode_200", alias: LATEST_ALIAS } },
            { add: { index: NEW_INDEX, alias: LATEST_ALIAS } },
            { add: { index: "pokenode_300", alias: PREVIOUS_ALIAS } },
        ]);
        expect(PokeIndexRepository.deleteIndices).toHaveBeenCalledWith([
            "pokenode_100",
            "pokenode_200",
        ]);
    });

    it("deletes orphan indices even when more recent than latest", async () => {
        givenIndices([
            { name: "pokenode_200", aliases: [LATEST_ALIAS] },
            { name: "pokenode_300", aliases: [] },
            { name: NEW_INDEX, aliases: [] },
        ]);

        await AliasRotationService.rotate(NEW_INDEX);

        expect(PokeIndexRepository.swapAliases).toHaveBeenCalledWith(
            expect.arrayContaining([
                { add: { index: "pokenode_200", alias: PREVIOUS_ALIAS } },
            ]),
        );
        expect(PokeIndexRepository.deleteIndices).toHaveBeenCalledWith([
            "pokenode_300",
        ]);
    });

    it("swaps aliases before deleting old indices", async () => {
        givenIndices([
            { name: "pokenode_200", aliases: [LATEST_ALIAS] },
            { name: NEW_INDEX, aliases: [] },
        ]);
        const calls: string[] = [];
        vi.mocked(PokeIndexRepository.swapAliases).mockImplementation(
            async () => {
                calls.push("swap");
            },
        );
        vi.mocked(PokeIndexRepository.deleteIndices).mockImplementation(
            async () => {
                calls.push("delete");
            },
        );

        await AliasRotationService.rotate(NEW_INDEX);

        expect(calls).toEqual(["swap", "delete"]);
    });

    it("logs a warning without failing when deletion fails", async () => {
        givenIndices([{ name: NEW_INDEX, aliases: [] }]);
        vi.mocked(PokeIndexRepository.deleteIndices).mockRejectedValue(
            new Error("boom"),
        );

        await expect(
            AliasRotationService.rotate(NEW_INDEX),
        ).resolves.toBeUndefined();
        expect(logger.warn).toHaveBeenCalledOnce();
    });

    it("does not delete anything when the swap fails", async () => {
        givenIndices([{ name: NEW_INDEX, aliases: [] }]);
        vi.mocked(PokeIndexRepository.swapAliases).mockRejectedValue(
            new Error("boom"),
        );

        await expect(AliasRotationService.rotate(NEW_INDEX)).rejects.toThrow(
            "boom",
        );
        expect(PokeIndexRepository.deleteIndices).not.toHaveBeenCalled();
    });

    it("ranks indices with a non numeric suffix as the oldest", async () => {
        givenIndices([
            { name: "pokenode_foo", aliases: [LATEST_ALIAS] },
            { name: "pokenode_200", aliases: [LATEST_ALIAS] },
            { name: NEW_INDEX, aliases: [] },
        ]);

        await AliasRotationService.rotate(NEW_INDEX);

        expect(PokeIndexRepository.swapAliases).toHaveBeenCalledWith(
            expect.arrayContaining([
                { add: { index: "pokenode_200", alias: PREVIOUS_ALIAS } },
            ]),
        );
        expect(PokeIndexRepository.deleteIndices).toHaveBeenCalledWith([
            "pokenode_foo",
        ]);
    });

    it("does not remove latest from the new index when it already holds it", async () => {
        givenIndices([
            { name: "pokenode_200", aliases: [LATEST_ALIAS] },
            { name: NEW_INDEX, aliases: [LATEST_ALIAS] },
        ]);

        await AliasRotationService.rotate(NEW_INDEX);

        expect(PokeIndexRepository.swapAliases).toHaveBeenCalledWith([
            { remove: { index: "pokenode_200", alias: LATEST_ALIAS } },
            { add: { index: NEW_INDEX, alias: LATEST_ALIAS } },
            { add: { index: "pokenode_200", alias: PREVIOUS_ALIAS } },
        ]);
        expect(PokeIndexRepository.deleteIndices).toHaveBeenCalledWith([]);
    });

    it("logs the rotation and the deleted indices", async () => {
        givenIndices([
            { name: "pokenode_100", aliases: [PREVIOUS_ALIAS] },
            { name: "pokenode_200", aliases: [LATEST_ALIAS] },
            { name: NEW_INDEX, aliases: [] },
        ]);

        await AliasRotationService.rotate(NEW_INDEX);

        expect(logger.info).toHaveBeenCalledWith("Aliases rotated", {
            latest: NEW_INDEX,
            previous: "pokenode_200",
        });
        expect(logger.info).toHaveBeenCalledWith("Old indices deleted", {
            indices: ["pokenode_100"],
        });
    });

    it("does not log a deletion when there is nothing to delete", async () => {
        givenIndices([{ name: NEW_INDEX, aliases: [] }]);

        await AliasRotationService.rotate(NEW_INDEX);

        expect(logger.info).toHaveBeenCalledExactlyOnceWith("Aliases rotated", {
            latest: NEW_INDEX,
            previous: null,
        });
    });
});
