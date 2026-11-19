import conf from "config";
import { PokeStoreConnectorParams } from "./connectors/PokeStoreConnector";
import { ChatbotConnectorParams, ChatbotRetrySettings } from "./types/chatbot";
import { tmpdir } from "node:os";
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
    chatbot: ChatbotConnectorParams;
};
type SettingsConfig = {
    workingDir: string;
    chatbotRetry: ChatbotRetrySettings;
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
        ),
    } as SettingsConfig,
};
