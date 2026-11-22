import { HTTPError, TimeoutError } from "ky";
import { Readable } from "node:stream";
import { ReadableStream as NodeReadableStream } from "node:stream/web";
import { chatbotConnector } from "../connectors";
import ChatbotConnector from "../connectors/ChatbotConnector";
import ChatbotRateLimitError from "../errors/ChatbotRateLimitError";
import ChatbotUnavailableError from "../errors/ChatbotUnavailableError";
import { ChatbotQueryResult } from "../types/chatbot";
import ChatbotAuthRepository from "./ChatbotAuthRepository";

export default class BattleRepository {
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
            );
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
        retried = false,
    ): Promise<Response> {
        const tokens = await ChatbotAuthRepository.getTokens();
        try {
            return await chatbotConnector
                .withSession(sessionId)
                .post(
                    `v1/open-completion/${encodeURIComponent(tokens.chatbotId)}/query`,
                    {
                        json: { query: prompt },
                        headers: {
                            Authorization: `Bearer ${tokens.accessToken}`,
                        },
                        signal,
                    },
                );
        } catch (error) {
            if (retried || !BattleRepository.#isUnauthorized(error)) {
                throw error;
            }
            ChatbotAuthRepository.invalidate(tokens);
            return BattleRepository.#sendQuery(prompt, signal, sessionId, true);
        }
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
        if (error instanceof HTTPError || error instanceof TimeoutError) {
            return new ChatbotUnavailableError(error);
        }
        return error;
    }
}
