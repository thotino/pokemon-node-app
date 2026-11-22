import { type Request, type Response, Router } from "express";
import { pipeline } from "node:stream/promises";
import BattleService from "../services/BattleService";
import { battleRequestBodySchema } from "./schemas/battleSchemas";
import { validateRequest } from "./middlewares/validateRequest";
import type { BattleRequest } from "../types/battle";
import type { ValidatedLocals } from "../types/validation";

const BattleController = Router();

/**
 * Start a battle between pokemons and stream the chatbot narration
 * @route POST /battles
 * @group Battles
 * @param {string[]} pokemonIds.body.required - Pokemon IDs
 */
BattleController.post(
    "/",
    validateRequest({ body: battleRequestBodySchema }),
    async (
        _req: Request,
        res: Response<
            unknown,
            ValidatedLocals<unknown, unknown, BattleRequest>
        >,
    ) => {
        const { pokemonIds } = res.locals.validated.body;

        const controller = new AbortController();
        res.on("close", () => {
            if (!res.writableFinished) {
                controller.abort();
            }
        });

        const battle = await BattleService.startBattle(
            { pokemonIds },
            controller.signal,
        );

        res.status(200).set({
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            ...(battle.sessionId != null
                ? { "X-Session-Id": battle.sessionId }
                : {}),
        });
        res.flushHeaders();
        try {
            await pipeline(battle.stream, res);
        } catch (error) {
            if (!controller.signal.aborted) {
                console.error("Battle stream failed:", error);
            }
            res.destroy();
        }
    },
);

export { BattleController };
