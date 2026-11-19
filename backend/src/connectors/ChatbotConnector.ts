import ky, { HTTPError, type KyInstance } from "ky";
import { BaseConnectorInterface } from "../types/connector";
import { ChatbotConnectorParams, ChatbotRetrySettings } from "../types/chatbot";

const RATE_LIMIT_STATUS_CODES = [429, 503];

export default class ChatbotConnector implements BaseConnectorInterface {
    static readonly SESSION_HEADER = "x-session-id";
    readonly client: KyInstance;
    #params: ChatbotConnectorParams;
    #retry: ChatbotRetrySettings;
    constructor(params: ChatbotConnectorParams, retry: ChatbotRetrySettings) {
        this.#params = params;
        this.#retry = retry;
        this.client = ky.create({
            baseUrl: ChatbotConnector.#withTrailingSlash(this.#params.url),
            timeout: false,
            retry: {
                limit: this.#retry.limit,
                methods: ["post"],
                statusCodes: RATE_LIMIT_STATUS_CODES,
                afterStatusCodes: RATE_LIMIT_STATUS_CODES,
                maxRetryAfter: this.#retry.maxRetryAfterMs,
                backoffLimit: this.#retry.backoffLimitMs,
                shouldRetry: ({ error }) =>
                    ChatbotConnector.#shouldRetry(
                        error,
                        this.#retry.maxRetryAfterMs,
                    ),
            },
        });
    }
    get apiKey() {
        return this.#params.apiKey;
    }
    async connect() {}
    async close() {}

    withSession(sessionId?: string): KyInstance {
        if (sessionId == null || sessionId.length === 0) {
            return this.client;
        }
        return this.client.extend({
            headers: { [ChatbotConnector.SESSION_HEADER]: sessionId },
        });
    }

    static readSessionId(response: Response): string | undefined {
        return (
            response.headers.get(ChatbotConnector.SESSION_HEADER) ?? undefined
        );
    }

    static retryAfterMs(response: Response): number | undefined {
        const header = response.headers.get("retry-after");
        if (header == null) {
            return undefined;
        }
        const seconds = Number(header);
        if (Number.isFinite(seconds)) {
            return Math.max(0, seconds * 1000);
        }
        const date = Date.parse(header);
        return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
    }

    static #shouldRetry(error: Error, maxRetryAfterMs: number) {
        if (!(error instanceof HTTPError)) {
            return undefined;
        }
        const delay = ChatbotConnector.retryAfterMs(error.response);
        if (delay != null && delay > maxRetryAfterMs) {
            return false;
        }
        return undefined;
    }

    static #withTrailingSlash(url: string): string {
        return url.endsWith("/") ? url : `${url}/`;
    }
}
