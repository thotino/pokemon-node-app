import PokeAPIConnector from "./PokeAPIConnector.js";
import PokeStoreConnector from "./PokeStoreConnector.js";

const pokeApiConnector = new PokeAPIConnector();
const pokeStoreConnector = new PokeStoreConnector();

export { pokeApiConnector, pokeStoreConnector };
