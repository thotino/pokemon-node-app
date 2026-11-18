import config from "../config";
import PokeStoreConnector from "./PokeStoreConnector";

const pokeStoreConnector = new PokeStoreConnector(config.connectors.pokeStore);
export { pokeStoreConnector };
