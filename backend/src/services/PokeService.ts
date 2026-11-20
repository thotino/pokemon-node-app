import PokeRepository from "../repositories/PokeRepository";
import PokemonNotFoundError from "../errors/PokemonNotFoundError";
import { PokemonSearchRequest } from "../types/search-pokemons";

export default class PokeService {
    static async getById(id: string) {
        const pokemon = await PokeRepository.getById(id);
        if (pokemon == null) {
            throw new PokemonNotFoundError([id]);
        }
        return pokemon;
    }

    static async search(pokeSearchReq: PokemonSearchRequest) {
        return await PokeRepository.getAll(pokeSearchReq);
    }
}
