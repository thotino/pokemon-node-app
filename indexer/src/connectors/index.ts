import config from "../config";
import PokeAPIConnector from "./PokeAPIConnector";
import PokeStoreConnector from "./PokeStoreConnector";

const pokeApiConnector = new PokeAPIConnector(config.connectors.pokeApi);
const pokeStoreConnector = new PokeStoreConnector(config.connectors.pokeStore);

export { pokeApiConnector, pokeStoreConnector };
