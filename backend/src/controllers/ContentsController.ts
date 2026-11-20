import { type Request, type Response, Router } from "express";
import ContentService from "../services/ContentService";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import ContentSchemas from "./schemas/ContentSchemas";
import { validateRequest } from "./middlewares/validateRequest";
import type { ContentParams } from "../types/content";
import type { ValidatedLocals } from "../types/validation";

const ContentController = Router();

/**
 * Save all pokemon as markdown in markdown folder
 * @route GET /contents/all
 * @group Contents
 */
ContentController.get("/all", async (_req: Request, res: Response) => {
    const jobId = randomUUID();
    ContentService.buildPokemonExport(jobId);
    return res.status(202).send({ job: "PokemonExport", jobId });
});

/**
 * Return a pokemon as markdown
 * @route GET /contents/:id
 * @group Contents
 * @param {string} id.path.required - Pokemon ID
 */
ContentController.get(
    "/:pokemonId",
    validateRequest({ params: ContentSchemas.params }),
    async (
        _req: Request,
        res: Response<unknown, ValidatedLocals<ContentParams>>,
    ) => {
        const { pokemonId } = res.locals.validated.params;
        const { fileName, fileStream } =
            await ContentService.buildPokemonFile(pokemonId);
        res.set({
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename=${fileName}`,
        });
        return await pipeline(fileStream, res);
    },
);

export { ContentController };
