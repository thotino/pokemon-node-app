import BattleRepository from "../repositories/BattleRepository";
import PokeService from "./PokeService";
import Pokemon from "../entities/Pokemon";
import PokemonNotFoundError from "../errors/PokemonNotFoundError";
import { BATTLE_WINNER_LABEL } from "../constants";
import { BattleRequest } from "../types/battle";
import { ChatbotQueryResult } from "../types/chatbot";

export default class BattleService {
    static async startBattle(
        request: BattleRequest,
        signal: AbortSignal,
    ): Promise<ChatbotQueryResult> {
        const fighters = await BattleService.#getFighters(request.pokemonIds);
        return BattleRepository.query(
            BattleService.#buildPrompt(fighters),
            signal,
        );
    }

    static async #getFighters(pokemonIds: string[]): Promise<Pokemon[]> {
        const results = await Promise.allSettled(
            pokemonIds.map(id => PokeService.getById(id)),
        );
        const fighters: Pokemon[] = [];
        const missingIds: string[] = [];
        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                fighters.push(result.value);
                return;
            }
            if (!(result.reason instanceof PokemonNotFoundError)) {
                throw result.reason;
            }
            missingIds.push(pokemonIds[index]);
        });
        if (missingIds.length !== 0) {
            throw new PokemonNotFoundError(missingIds);
        }
        return fighters;
    }

    static #buildPrompt(fighters: Pokemon[]) {
        const roster = fighters
            .map(fighter => `${fighter.name} (#${fighter.id})`)
            .join(", ");
        return [
            `Simule un combat Pokémon entre les Pokémon suivants : ${roster}.`,
            "Raconte le combat tour par tour.",
            "Le vainqueur doit obligatoirement être l'un des Pokémon listés ci-dessus.",
            `Termine ta réponse par une dernière ligne, seule, au format exact : "${BATTLE_WINNER_LABEL} <nom> (#<identifiant>)".`,
        ].join("\n");
    }
}
