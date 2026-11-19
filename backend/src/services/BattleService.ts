import { errors } from "@elastic/elasticsearch";
import BattleRepository from "../repositories/BattleRepository";
import PokeService from "./PokeService";
import PokemonNotFoundError from "../errors/PokemonNotFoundError";
import { BattleRequest } from "../types/battle";
import { ChatbotQueryResult } from "../types/chatbot";

export default class BattleService {
    static async startBattle(
        request: BattleRequest,
        signal: AbortSignal,
    ): Promise<ChatbotQueryResult> {
        await BattleService.#assertPokemonsExist(request.pokemonIds);
        return BattleRepository.query(
            BattleService.#buildPrompt(request.pokemonIds),
            signal,
        );
    }

    static async #assertPokemonsExist(pokemonIds: string[]) {
        const results = await Promise.allSettled(
            pokemonIds.map(id => PokeService.getById(id)),
        );
        const missingIds: string[] = [];
        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                return;
            }
            if (!BattleService.#isNotFound(result.reason)) {
                throw result.reason;
            }
            missingIds.push(pokemonIds[index]);
        });
        if (missingIds.length !== 0) {
            throw new PokemonNotFoundError(missingIds);
        }
    }

    static #isNotFound(error: unknown) {
        return (
            (error instanceof errors.ResponseError &&
                error.statusCode === 404) ||
            (error instanceof Error &&
                error.message === "ERR_POKEMON_NOT_FOUND")
        );
    }

    static #buildPrompt(pokemonIds: string[]) {
        return [
            `Simule un combat Pokémon entre les Pokémon d'identifiants ${pokemonIds.join(", ")}.`,
            "Raconte le combat tour par tour et annonce le vainqueur à la fin.",
        ].join("\n");
    }
}
