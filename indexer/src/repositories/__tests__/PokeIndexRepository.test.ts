import { describe, expect, it, vi } from "vitest";
import PokeIndexRepository from "../PokeIndexRepository";
import { pokeStoreConnector } from "../../connectors/index";
import { Pokemon } from "../../types/pokemon";

vi.mock("../../connectors/index", () => ({
    pokeStoreConnector: {
        client: {
            bulk: vi.fn(),
            indices: {
                resolveIndex: vi.fn(),
                updateAliases: vi.fn(),
                delete: vi.fn(),
                flush: vi.fn(),
                create: vi.fn(),
                close: vi.fn(),
                putSettings: vi.fn(),
                open: vi.fn(),
                putMapping: vi.fn(),
            },
        },
    },
}));

const { client } = pokeStoreConnector;
const { indices } = client;
const INDEX_NAME = "pokenode_100";

type BulkResponse = Awaited<ReturnType<typeof client.bulk>>;

function givenBulkResponse(response: Partial<BulkResponse>) {
    vi.mocked(client.bulk).mockResolvedValue(response as BulkResponse);
}

describe("PokeIndexRepository.getIndicesWithAliases", () => {
    it("resolves open indices matching the pattern with their aliases", async () => {
        vi.mocked(indices.resolveIndex).mockResolvedValue({
            indices: [
                { name: "pokenode_100", aliases: ["pokenode_latest"] },
                { name: "pokenode_200" },
            ],
            aliases: [],
            data_streams: [],
        } as unknown as Awaited<ReturnType<typeof indices.resolveIndex>>);

        const result =
            await PokeIndexRepository.getIndicesWithAliases("pokenode_*");

        expect(indices.resolveIndex).toHaveBeenCalledWith({
            name: "pokenode_*",
            expand_wildcards: "open",
        });
        expect(result).toEqual([
            { name: "pokenode_100", aliases: ["pokenode_latest"] },
            { name: "pokenode_200", aliases: [] },
        ]);
    });
});

describe("PokeIndexRepository.swapAliases", () => {
    it("does nothing when there is no action", async () => {
        await PokeIndexRepository.swapAliases([]);

        expect(indices.updateAliases).not.toHaveBeenCalled();
    });

    it("sends all actions in a single request", async () => {
        const actions = [
            { remove: { index: "pokenode_100", alias: "pokenode_latest" } },
            { add: { index: "pokenode_200", alias: "pokenode_latest" } },
        ];

        await PokeIndexRepository.swapAliases(actions);

        expect(indices.updateAliases).toHaveBeenCalledWith({ actions });
    });
});

describe("PokeIndexRepository.deleteIndices", () => {
    it("does nothing when there is no index", async () => {
        await PokeIndexRepository.deleteIndices([]);

        expect(indices.delete).not.toHaveBeenCalled();
    });

    it("deletes all indices in a single request", async () => {
        await PokeIndexRepository.deleteIndices([
            "pokenode_100",
            "pokenode_200",
        ]);

        expect(indices.delete).toHaveBeenCalledWith({
            index: ["pokenode_100", "pokenode_200"],
        });
    });
});

describe("PokeIndexRepository.flushIndex", () => {
    it("flushes the index and returns the response", async () => {
        const response = { _shards: { total: 1, successful: 1, failed: 0 } };
        vi.mocked(indices.flush).mockResolvedValue(response);

        await expect(PokeIndexRepository.flushIndex(INDEX_NAME)).resolves.toBe(
            response,
        );
        expect(indices.flush).toHaveBeenCalledWith({ index: INDEX_NAME });
    });
});

describe("PokeIndexRepository.createIndexWithMeta", () => {
    const mapping = { properties: { name: { type: "text" } } };
    const settings = { index: { refresh_interval: "60s" } };

    it("creates the index with a single shard", async () => {
        await PokeIndexRepository.createIndexWithMeta(INDEX_NAME, {
            mapping,
            settings,
        });

        expect(indices.create).toHaveBeenCalledWith({
            index: INDEX_NAME,
            settings: { number_of_shards: 1 },
        });
    });

    it("applies settings on the closed index then puts the mapping", async () => {
        const calls: string[] = [];
        const track = (name: string) => async () => {
            calls.push(name);
            return {} as never;
        };
        vi.mocked(indices.create).mockImplementation(track("create"));
        vi.mocked(indices.close).mockImplementation(track("close"));
        vi.mocked(indices.putSettings).mockImplementation(track("putSettings"));
        vi.mocked(indices.open).mockImplementation(track("open"));
        vi.mocked(indices.putMapping).mockImplementation(track("putMapping"));

        await PokeIndexRepository.createIndexWithMeta(INDEX_NAME, {
            mapping,
            settings,
        });

        expect(calls).toEqual([
            "create",
            "close",
            "putSettings",
            "open",
            "putMapping",
        ]);
        expect(indices.close).toHaveBeenCalledWith({ index: INDEX_NAME });
        expect(indices.putSettings).toHaveBeenCalledWith({
            index: INDEX_NAME,
            settings,
        });
        expect(indices.open).toHaveBeenCalledWith({ index: INDEX_NAME });
        expect(indices.putMapping).toHaveBeenCalledWith({
            index: INDEX_NAME,
            ...mapping,
        });
    });
});

describe("PokeIndexRepository.bulkIndex", () => {
    const documents = [{ id: 1 }, { id: 2 }] as unknown as Pokemon[];

    it("indexes each document under its id and returns the response", async () => {
        const response = { errors: false, items: [], took: 1 };
        givenBulkResponse(response);

        await expect(
            PokeIndexRepository.bulkIndex(INDEX_NAME, documents),
        ).resolves.toBe(response);
        expect(client.bulk).toHaveBeenCalledWith({
            index: INDEX_NAME,
            body: [
                { index: { _index: INDEX_NAME, _id: 1 } },
                documents[0],
                { index: { _index: INDEX_NAME, _id: 2 } },
                documents[1],
            ],
        });
    });

    it("throws an AggregateError with only the failed items", async () => {
        givenBulkResponse({
            errors: true,
            items: [
                { index: { _index: INDEX_NAME, status: 201 } },
                {
                    index: {
                        _index: INDEX_NAME,
                        status: 400,
                        error: {
                            type: "mapper_parsing_exception",
                            reason: "failed to parse",
                        },
                    },
                },
            ],
        });

        const error = await PokeIndexRepository.bulkIndex(
            INDEX_NAME,
            documents,
        ).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).message).toBe(
            "Error in bulk indexing",
        );
        expect(
            (error as AggregateError).errors.map((e: Error) => e.message),
        ).toEqual(["[mapper_parsing_exception] failed to parse"]);
    });

    it("chains the Elasticsearch causes", async () => {
        givenBulkResponse({
            errors: true,
            items: [
                {
                    index: {
                        _index: INDEX_NAME,
                        status: 400,
                        error: {
                            type: "mapper_parsing_exception",
                            reason: "failed to parse",
                            caused_by: {
                                type: "illegal_argument_exception",
                                reason: "bad value",
                            },
                        },
                    },
                },
            ],
        });

        const error = (await PokeIndexRepository.bulkIndex(
            INDEX_NAME,
            documents,
        ).catch((e: unknown) => e)) as AggregateError;
        const [itemError] = error.errors as Error[];
        const cause = itemError.cause as Error;

        expect(cause).toBeInstanceOf(Error);
        expect(cause.message).toBe("[illegal_argument_exception] bad value");
        expect(cause.cause).toBeUndefined();
    });
});
