import { ServiceErrorInterface } from "../types/error";

export default class ChatbotRateLimitError
    extends Error
    implements ServiceErrorInterface
{
    readonly code = "ERR_CHATBOT_RATE_LIMITED";
    readonly retryAfterSeconds?: number;
    readonly cause?: unknown;
    constructor(retryAfterSeconds?: number, cause?: unknown) {
        super("Chatbot rate limit reached");
        this.name = "ChatbotRateLimitError";
        this.retryAfterSeconds = retryAfterSeconds;
        this.cause = cause;
    }
    get value() {
        return this.retryAfterSeconds;
    }
}
