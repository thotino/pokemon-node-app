import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { PokemonController } from "../PokemonController";
import { handleError } from "../middlewares/handleError";
import PokeService from "../../services/PokeService";
import Pokemon from "../../entities/Pokemon";
import PokemonNotFoundError from "../../errors/PokemonNotFoundError";
import type { PokemonSearchResponse } from "../../types/search-pokemons";

vi.mock("../../services/PokeService");

const app = express();
app.set("query parser", "simple");
app.use("/pokemons", PokemonController);
app.use(handleError);

const page = {
    from: 0,
    size: 20,
    total: 0,
    items: [],
    filters: [],
} as PokemonSearchResponse;

describe("PokemonController", () => {
    describe("GET /pokemons", () => {
        it("searches with the default pagination", async () => {
            vi.mocked(PokeService.search).mockResolvedValue(page);

            const response = await request(app).get("/pokemons");

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ pokemons: page });
            expect(PokeService.search).toHaveBeenCalledWith({
                keywords: undefined,
                types: undefined,
                from: 0,
                size: 20,
            });
        });

        it("passes the coerced query to the service", async () => {
            vi.mocked(PokeService.search).mockResolvedValue(page);

            await request(app).get(
                "/pokemons?q=pika&types=electric&types=water&from=40&size=10",
            );

            expect(PokeService.search).toHaveBeenCalledWith({
                keywords: "pika",
                types: ["electric", "water"],
                from: 40,
                size: 10,
            });
        });

        it("wraps a single type in an array", async () => {
            vi.mocked(PokeService.search).mockResolvedValue(page);

            await request(app).get("/pokemons?types=fire");

            expect(PokeService.search).toHaveBeenCalledWith(
                expect.objectContaining({ types: ["fire"] }),
            );
        });

        it.each([
            ["a non numeric size", "size=abc", "/size"],
            ["a partially numeric size", "size=10abc", "/size"],
            ["a zero size", "size=0", "/size"],
            ["a size above the maximum", "size=101", "/size"],
            ["a negative offset", "from=-1", "/from"],
            ["an empty type", "types=", "/types/0"],
            ["duplicated types", "types=fire&types=fire", "/types"],
            ["repeated keywords", "q=a&q=b", "/q"],
            ["an unknown parameter", "foo=bar", "/foo"],
        ])("rejects %s with a 400", async (_label, query, path) => {
            const response = await request(app).get(`/pokemons?${query}`);

            expect(response.status).toBe(400);
            expect(response.body).toMatchObject({
                code: "ERR_INVALID_REQUEST",
                validationErrors: [
                    expect.objectContaining({ location: "query", path }),
                ],
            });
            expect(PokeService.search).not.toHaveBeenCalled();
        });
    });

    describe("GET /pokemons/:id", () => {
        it("returns the pokemon", async () => {
            const pokemon = { id: 25, name: "Pikachu" } as Pokemon;
            vi.mocked(PokeService.getById).mockResolvedValue(pokemon);

            const response = await request(app).get("/pokemons/25");

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ pokemon });
            expect(PokeService.getById).toHaveBeenCalledWith("25");
        });

        it.each(["pikachu", "0", "025", "-6", "%20"])(
            "rejects the id %s with a 400",
            async id => {
                const response = await request(app).get(`/pokemons/${id}`);

                expect(response.status).toBe(400);
                expect(response.body.validationErrors).toEqual([
                    expect.objectContaining({
                        location: "params",
                        path: "/id",
                        keyword: "pattern",
                    }),
                ]);
                expect(PokeService.getById).not.toHaveBeenCalled();
            },
        );

        it("answers 404 for an unknown pokemon", async () => {
            vi.mocked(PokeService.getById).mockRejectedValue(
                new PokemonNotFoundError(["9999"]),
            );

            const response = await request(app).get("/pokemons/9999");

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                code: "ERR_POKEMON_NOT_FOUND",
                message: "Pokemon not found: 9999",
                value: ["9999"],
            });
        });
    });
});
