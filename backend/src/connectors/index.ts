import config from "../config";
import ChatbotConnector from "./ChatbotConnector";
import PokeStoreConnector from "./PokeStoreConnector";

const pokeStoreConnector = new PokeStoreConnector(config.connectors.pokeStore);
const chatbotConnector = new ChatbotConnector(
    config.connectors.chatbot,
    config.settings.chatbotRetry,
);
export { chatbotConnector, pokeStoreConnector };
