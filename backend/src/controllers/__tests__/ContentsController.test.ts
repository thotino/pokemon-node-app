import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { Readable } from "node:stream";
import { ContentController } from "../ContentsController";
import { handleError } from "../middlewares/handleError";
import ContentService from "../../services/ContentService";
import PokemonNotFoundError from "../../errors/PokemonNotFoundError";

vi.mock("../../services/ContentService");

const app = express();
app.use("/contents", ContentController);
app.use(handleError);

describe("ContentController", () => {
    describe("GET /contents/:pokemonId", () => {
        it("downloads the pokemon as markdown", async () => {
            vi.mocked(ContentService.buildPokemonFile).mockResolvedValue({
                fileName: "25-pikachu.md",
                fileStream: Readable.from(["# Pikachu"]),
            });

            const response = await request(app).get("/contents/25");

            expect(response.status).toBe(200);
            expect(response.headers["content-disposition"]).toBe(
                "attachment; filename=25-pikachu.md",
            );
            expect(ContentService.buildPokemonFile).toHaveBeenCalledWith("25");
        });

        it.each(["pikachu", "0", "-6"])(
            "rejects the id %s with a 400",
            async id => {
                const response = await request(app).get(`/contents/${id}`);

                expect(response.status).toBe(400);
                expect(response.body).toMatchObject({
                    code: "ERR_INVALID_REQUEST",
                    validationErrors: [
                        expect.objectContaining({
                            location: "params",
                            path: "/pokemonId",
                            keyword: "pattern",
                        }),
                    ],
                });
                expect(ContentService.buildPokemonFile).not.toHaveBeenCalled();
            },
        );

        it("answers 404 for an unknown pokemon", async () => {
            vi.mocked(ContentService.buildPokemonFile).mockRejectedValue(
                new PokemonNotFoundError(["9999"]),
            );

            const response = await request(app).get("/contents/9999");

            expect(response.status).toBe(404);
            expect(response.body).toMatchObject({
                code: "ERR_POKEMON_NOT_FOUND",
            });
        });
    });

    describe("GET /contents/all", () => {
        it("starts the export without being caught by the id route", async () => {
            const response = await request(app).get("/contents/all");

            expect(response.status).toBe(202);
            expect(response.body).toMatchObject({ job: "PokemonExport" });
            expect(ContentService.buildPokemonExport).toHaveBeenCalled();
        });
    });
});
