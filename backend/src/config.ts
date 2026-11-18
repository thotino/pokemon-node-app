import conf from "config";
import { PokeStoreConnectorParams } from "./connectors/PokeStoreConnector";
type ServiceConfig = {
    name: string;
    version: string;
    loggingHumanFormat: boolean;
    loggingLevel: string;
    gracefulShutdownDelayInSeconds: number;
};

type WebserverConfig = {
    host: string;
    port: number;
};

type ConnectorsConfig = {
    pokeStore: PokeStoreConnectorParams;
};
export default {
    service: conf.get("service") as ServiceConfig,
    webserver: conf.get("webserver") as WebserverConfig,
    connectors: conf.get("connectors") as ConnectorsConfig,
};
