import PokeRepository from "../repositories/PokeRepository";
import { PokemonSearchRequest } from "../types/search-request";

export default class PokeService {
  static async getById(id: string) {
    const pokemon = await PokeRepository.getById(id);
    if (pokemon == null) {
      throw Error("ERR_POKEMON_NOT_FOUND");
    }
    return pokemon;
  }

  static async search(pokeSearchReq: PokemonSearchRequest) {
    return await PokeRepository.getAll(pokeSearchReq)
  }
}
