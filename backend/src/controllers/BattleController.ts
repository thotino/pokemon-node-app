import { type Request, type Response, Router } from "express";
import { HTTPError, TimeoutError } from "ky";
import { pipeline } from "node:stream/promises";
import BattleService from "../services/BattleService";
import ChatbotRateLimitError from "../errors/ChatbotRateLimitError";
import PokemonNotFoundError from "../errors/PokemonNotFoundError";
import { MAX_FIGHTERS, MIN_FIGHTERS } from "../constants";
import { ServiceErrorInterface } from "../types/error";

const BattleController = Router();

function parsePokemonIds(body: unknown): string[] | undefined {
    const pokemonIds = (body as { pokemonIds?: unknown } | undefined)
        ?.pokemonIds;
    if (!Array.isArray(pokemonIds)) {
        return undefined;
    }
    const ids = pokemonIds
        .filter(
            (id): id is string | number =>
                typeof id === "string" ||
                (typeof id === "number" && Number.isInteger(id)),
        )
        .map(id => String(id).trim())
        .filter(id => id.length !== 0);
    const isValid =
        ids.length === pokemonIds.length &&
        new Set(ids).size === ids.length &&
        ids.length >= MIN_FIGHTERS &&
        ids.length <= MAX_FIGHTERS;
    return isValid ? ids : undefined;
}

function sendError(
    res: Response,
    status: number,
    error: ServiceErrorInterface,
) {
    return res.status(status).send({
        code: error.code,
        message: error.message,
        value: error.value ?? null,
    });
}

/**
 * Start a battle between pokemons and stream the chatbot narration
 * @route POST /battles
 * @group Battles
 * @param {string[]} pokemonIds.body.required - Pokemon IDs
 */
BattleController.post("/", async (req: Request, res: Response) => {
    const pokemonIds = parsePokemonIds(req.body);
    if (pokemonIds == null) {
        return sendError(res, 400, {
            code: "ERR_INVALID_BATTLE_REQUEST",
            message: `pokemonIds must contain ${MIN_FIGHTERS} to ${MAX_FIGHTERS} distinct ids`,
        });
    }

    const controller = new AbortController();
    res.on("close", () => {
        if (!res.writableFinished) {
            controller.abort();
        }
    });

    let battle;
    try {
        battle = await BattleService.startBattle(
            { pokemonIds },
            controller.signal,
        );
    } catch (error) {
        if (error instanceof PokemonNotFoundError) {
            return sendError(res, 404, error);
        }
        if (error instanceof ChatbotRateLimitError) {
            if (error.retryAfterSeconds != null) {
                res.set("Retry-After", String(error.retryAfterSeconds));
            }
            return sendError(res, 429, error);
        }
        if (error instanceof HTTPError || error instanceof TimeoutError) {
            return sendError(res, 502, {
                code: "ERR_CHATBOT_UNAVAILABLE",
                message: "Chatbot request failed",
            });
        }
        console.error("Battle failed:", error);
        return sendError(res, 500, {
            code: "ERR_INTERNAL",
            message: "Battle could not be started",
        });
    }

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
});

export { BattleController };
