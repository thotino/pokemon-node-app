import { type Request, type Response, Router } from "express";
import PokeService from "../services/PokeService";
import {
    pokemonIdParamsSchema,
    pokemonSearchQuerySchema,
} from "./schemas/pokemonSchemas";
import { validateRequest } from "./middlewares/validateRequest";
import type { PokemonIdParams } from "../types/pokemon";
import type { PokemonSearchQuery } from "../types/search-pokemons";
import type { ValidatedLocals } from "../types/validation";

const PokemonController = Router();

PokemonController.get(
    "/",
    validateRequest({ query: pokemonSearchQuerySchema }),
    async (
        _req: Request,
        res: Response<unknown, ValidatedLocals<unknown, PokemonSearchQuery>>,
    ) => {
        const { q, types, from, size } = res.locals.validated.query;
        const pokeSearchRes = await PokeService.search({
            keywords: q,
            types,
            from,
            size,
        });
        return res.status(200).send({ pokemons: pokeSearchRes });
    },
);

PokemonController.get(
    "/:id",
    validateRequest({ params: pokemonIdParamsSchema }),
    async (
        _req: Request,
        res: Response<unknown, ValidatedLocals<PokemonIdParams>>,
    ) => {
        const { id } = res.locals.validated.params;
        const pokemon = await PokeService.getById(id);
        return res.status(200).send({ pokemon });
    },
);

export { PokemonController };
