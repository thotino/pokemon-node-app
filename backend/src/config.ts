import conf from "config";
import { PokeStoreConnectorParams } from "./connectors/PokeStoreConnector";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import path from "node:path";
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
type SettingsConfig = {
    workingDir: string;
};
export default {
    service: conf.get("service") as ServiceConfig,
    webserver: conf.get("webserver") as WebserverConfig,
    connectors: conf.get("connectors") as ConnectorsConfig,
    settings: {
        ...conf.get("settings"),
        workingDir: path.join(
            conf.get("settings.workingDir") ?? tmpdir(),
            conf.get("service.name"),
            randomUUID(),
        ),
    } as SettingsConfig,
};
