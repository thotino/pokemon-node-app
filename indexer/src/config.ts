import conf from "config";
import { PokeAPIConnectorParams } from "./connectors/PokeAPIConnector";
import { PokeStoreConnectorParams } from "./connectors/PokeStoreConnector";
type ServiceConfig = {
    name: string;
};
type ConnectorsConfig = {
    pokeApi: PokeAPIConnectorParams;
    pokeStore: PokeStoreConnectorParams;
};
export default {
    service: conf.get("service") as ServiceConfig,
    connectors: conf.get("connectors") as ConnectorsConfig,
};
