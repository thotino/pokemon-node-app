import type { ServiceErrorInterface } from "../types/error";

export default class ChatbotUnavailableError
    extends Error
    implements ServiceErrorInterface
{
    readonly code = "ERR_CHATBOT_UNAVAILABLE";
    readonly value = null;
    readonly cause?: unknown;
    constructor(cause?: unknown) {
        super("Chatbot request failed");
        this.name = "ChatbotUnavailableError";
        this.cause = cause;
    }
}
