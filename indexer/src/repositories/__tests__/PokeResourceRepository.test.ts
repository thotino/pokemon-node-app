import { beforeEach, describe, expect, it, vi } from "vitest";
import type PokeResourceRepositoryClass from "../PokeResourceRepository";
import { pokeApiConnector } from "../../connectors";

vi.mock("../../connectors", () => ({
    pokeApiConnector: { client: { get: vi.fn() } },
}));

const API = "https://pokeapi.co/api/v2";
const GRASS_URL = `${API}/type/12/`;
const POISON_URL = `${API}/type/4/`;
const GRASS = { name: "grass" };
const POISON = { name: "poison" };

const pokeApiResponseJson = vi.fn();
let PokeResourceRepository: typeof PokeResourceRepositoryClass;

beforeEach(async () => {
    vi.mocked(pokeApiConnector.client.get).mockReturnValue({
        json: pokeApiResponseJson,
    } as never);
    vi.resetModules();
    ({ default: PokeResourceRepository } =
        await import("../PokeResourceRepository"));
});

describe("PokeResourceRepository.get", () => {
    it("fetches the resource from PokeAPI", async () => {
        pokeApiResponseJson.mockResolvedValueOnce(GRASS);

        const type = await PokeResourceRepository.get(GRASS_URL);

        expect(type).toEqual(GRASS);
        expect(pokeApiConnector.client.get).toHaveBeenCalledExactlyOnceWith(
            GRASS_URL,
        );
    });

    it("shares one request between concurrent calls for the same url", async () => {
        pokeApiResponseJson.mockResolvedValueOnce(GRASS);

        const [first, second] = await Promise.all([
            PokeResourceRepository.get(GRASS_URL),
            PokeResourceRepository.get(GRASS_URL),
        ]);

        expect(first).toBe(GRASS);
        expect(second).toBe(GRASS);
        expect(pokeApiConnector.client.get).toHaveBeenCalledExactlyOnceWith(
            GRASS_URL,
        );
    });

    it("reuses a resolved resource without calling PokeAPI again", async () => {
        pokeApiResponseJson.mockResolvedValueOnce(GRASS);
        await PokeResourceRepository.get(GRASS_URL);

        const type = await PokeResourceRepository.get(GRASS_URL);

        expect(type).toBe(GRASS);
        expect(pokeApiConnector.client.get).toHaveBeenCalledExactlyOnceWith(
            GRASS_URL,
        );
    });

    it("fetches each distinct url once", async () => {
        pokeApiResponseJson
            .mockResolvedValueOnce(GRASS)
            .mockResolvedValueOnce(POISON);

        const types = await Promise.all([
            PokeResourceRepository.get(GRASS_URL),
            PokeResourceRepository.get(POISON_URL),
        ]);

        expect(types).toEqual([GRASS, POISON]);
        expect(vi.mocked(pokeApiConnector.client.get).mock.calls).toEqual([
            [GRASS_URL],
            [POISON_URL],
        ]);
    });

    it("propagates a PokeAPI error to every concurrent caller", async () => {
        pokeApiResponseJson.mockRejectedValueOnce(new Error("PokeAPI down"));

        const results = await Promise.allSettled([
            PokeResourceRepository.get(GRASS_URL),
            PokeResourceRepository.get(GRASS_URL),
        ]);

        expect(results).toEqual([
            { status: "rejected", reason: new Error("PokeAPI down") },
            { status: "rejected", reason: new Error("PokeAPI down") },
        ]);
        expect(pokeApiConnector.client.get).toHaveBeenCalledExactlyOnceWith(
            GRASS_URL,
        );
    });

    it("fetches the resource again after a failure", async () => {
        pokeApiResponseJson
            .mockRejectedValueOnce(new Error("PokeAPI down"))
            .mockResolvedValueOnce(GRASS);
        await expect(PokeResourceRepository.get(GRASS_URL)).rejects.toThrow(
            "PokeAPI down",
        );

        const type = await PokeResourceRepository.get(GRASS_URL);

        expect(type).toBe(GRASS);
        expect(vi.mocked(pokeApiConnector.client.get).mock.calls).toEqual([
            [GRASS_URL],
            [GRASS_URL],
        ]);
    });
});

describe("PokeResourceRepository.clear", () => {
    it("forgets the resources so they are fetched again", async () => {
        pokeApiResponseJson
            .mockResolvedValueOnce(GRASS)
            .mockResolvedValueOnce(GRASS);
        await PokeResourceRepository.get(GRASS_URL);

        PokeResourceRepository.clear();
        await PokeResourceRepository.get(GRASS_URL);

        expect(vi.mocked(pokeApiConnector.client.get).mock.calls).toEqual([
            [GRASS_URL],
            [GRASS_URL],
        ]);
    });
});
