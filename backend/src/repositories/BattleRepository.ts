import { HTTPError } from "ky";
import { Readable } from "node:stream";
import { ReadableStream as NodeReadableStream } from "node:stream/web";
import { chatbotConnector } from "../connectors";
import ChatbotConnector from "../connectors/ChatbotConnector";
import ChatbotRateLimitError from "../errors/ChatbotRateLimitError";
import {
    ChatbotQueryResult,
    ChatbotTokenResponse,
    IChatbotTokens,
} from "../types/chatbot";

const TOKEN_EXPIRY_MARGIN_MS = 30_000;

export default class BattleRepository {
    static #tokens?: IChatbotTokens;
    static #pendingAuth?: Promise<IChatbotTokens>;

    static async exchangeApiKey(): Promise<IChatbotTokens> {
        const response = (await chatbotConnector.client
            .post("v1/auth/api-key/token", {
                json: { apiKey: chatbotConnector.apiKey },
            })
            .json()) as ChatbotTokenResponse;
        return BattleRepository.#toTokens(response);
    }

    static async refreshTokens(
        current: IChatbotTokens,
    ): Promise<IChatbotTokens> {
        const response = (await chatbotConnector.client
            .post("v1/auth/api-key/refresh", {
                json: {
                    refreshToken: current.refreshToken,
                    chatbotId: current.chatbotId,
                },
            })
            .json()) as ChatbotTokenResponse;
        return BattleRepository.#toTokens(response);
    }

    static clearTokens() {
        BattleRepository.#tokens = undefined;
    }

    static async query(
        prompt: string,
        signal: AbortSignal,
        sessionId?: string,
    ): Promise<ChatbotQueryResult> {
        try {
            const response = await BattleRepository.#sendQuery(
                prompt,
                signal,
                sessionId,
            ).catch(error => {
                if (BattleRepository.#isUnauthorized(error)) {
                    BattleRepository.clearTokens();
                    return BattleRepository.#sendQuery(
                        prompt,
                        signal,
                        sessionId,
                    );
                }
                throw error;
            });
            return {
                sessionId:
                    ChatbotConnector.readSessionId(response) ?? sessionId,
                stream: BattleRepository.#toStream(response),
            };
        } catch (error) {
            throw BattleRepository.#mapError(error);
        }
    }

    static async #sendQuery(
        prompt: string,
        signal: AbortSignal,
        sessionId?: string,
    ): Promise<Response> {
        const tokens = await BattleRepository.#getTokens();
        return chatbotConnector
            .withSession(sessionId)
            .post(
                `v1/open-completion/${encodeURIComponent(tokens.chatbotId)}/query`,
                {
                    json: { query: prompt },
                    headers: { Authorization: `Bearer ${tokens.accessToken}` },
                    signal,
                },
            );
    }

    static async #getTokens(): Promise<IChatbotTokens> {
        const tokens = BattleRepository.#tokens;
        if (tokens != null && BattleRepository.#isValid(tokens)) {
            return tokens;
        }
        BattleRepository.#pendingAuth ??= BattleRepository.#authenticate(
            tokens,
        ).finally(() => {
            BattleRepository.#pendingAuth = undefined;
        });
        return BattleRepository.#pendingAuth;
    }

    static async #authenticate(
        current?: IChatbotTokens,
    ): Promise<IChatbotTokens> {
        const tokens =
            current == null
                ? await BattleRepository.exchangeApiKey()
                : await BattleRepository.refreshTokens(current).catch(() =>
                      BattleRepository.exchangeApiKey(),
                  );
        BattleRepository.#tokens = tokens;
        return tokens;
    }

    static #isValid(tokens: IChatbotTokens) {
        return tokens.expiresAt - TOKEN_EXPIRY_MARGIN_MS > Date.now();
    }

    static #toTokens(response: ChatbotTokenResponse): IChatbotTokens {
        return {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            chatbotId: response.chatbotId,
            expiresAt: Date.now() + response.expiresIn * 1000,
        };
    }

    static #toStream(response: Response): Readable {
        if (response.body == null) {
            return Readable.from([]);
        }
        return Readable.fromWeb(response.body as NodeReadableStream);
    }

    static #isUnauthorized(error: unknown) {
        return error instanceof HTTPError && error.response.status === 401;
    }

    static #mapError(error: unknown) {
        if (error instanceof HTTPError && error.response.status === 429) {
            const delay = ChatbotConnector.retryAfterMs(error.response);
            return new ChatbotRateLimitError(
                delay == null ? undefined : Math.ceil(delay / 1000),
                error,
            );
        }
        return error;
    }
}
