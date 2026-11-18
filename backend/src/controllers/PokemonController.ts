import { type Request, type Response, Router } from "express";
import PokeService from "../services/PokeService";
import { PokemonSearchRequest } from "../types/search-pokemons";

const PokemonController = Router();
const DEFAULT_OFFSET = 0;
const DEFAULT_SIZE = 20;
PokemonController.get("/", async (req: Request, res: Response) => {
    const { q, types, from, size } = req.query;

    const parsedTypes =
        typeof types === "string"
            ? [types]
            : Array.isArray(types)
              ? types
                    .filter(
                        (type): type is string =>
                            typeof type === "string" && type.length !== 0,
                    )
                    .map(type => type.trim())
              : undefined;
    const pokeSearchReq: PokemonSearchRequest = {
        from: typeof from === "string" ? parseInt(from) : DEFAULT_OFFSET,
        size: typeof size === "string" ? parseInt(size) : DEFAULT_SIZE,
        types: Array.isArray(parsedTypes) && parsedTypes.length !== 0 ? parsedTypes : undefined,
        keywords: typeof q === "string" ? q : undefined,
    };
    const pokeSearchRes = await PokeService.search(pokeSearchReq);
    return res.status(200).send({ pokemons: pokeSearchRes });
});

PokemonController.get("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id != "string") {
        return res.sendStatus(400);
    }

    const pokemon = await PokeService.getById(id);

    return res.status(200).send({ pokemon });
});

export { PokemonController };
