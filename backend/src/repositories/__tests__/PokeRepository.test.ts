import { describe, expect, it, vi } from "vitest";
import PokeRepository from "../PokeRepository";
import Pokemon from "../../entities/Pokemon";
import { pokeStoreConnector } from "../../connectors";

vi.mock("../../connectors", () => ({
    pokeStoreConnector: { client: { get: vi.fn() } },
}));

describe("PokeRepository", () => {
    describe("getById", () => {
        it("returns the pokemon from the store", async () => {
            vi.mocked(pokeStoreConnector.client.get).mockResolvedValue({
                found: true,
                _source: { id: 25, name: "Pikachu" },
            } as never);

            const pokemon = await PokeRepository.getById("25");

            expect(pokemon).toBeInstanceOf(Pokemon);
            expect(pokeStoreConnector.client.get).toHaveBeenCalledWith(
                { id: "25", index: "latest_pokenode" },
                { ignore: [404] },
            );
        });

        it("returns null when the pokemon does not exist", async () => {
            vi.mocked(pokeStoreConnector.client.get).mockResolvedValue({
                found: false,
            } as never);

            expect(await PokeRepository.getById("9999")).toBeNull();
        });

        it("propagates store failures", async () => {
            const failure = new Error("connection refused");
            vi.mocked(pokeStoreConnector.client.get).mockRejectedValue(failure);

            await expect(PokeRepository.getById("25")).rejects.toBe(failure);
        });
    });
});
