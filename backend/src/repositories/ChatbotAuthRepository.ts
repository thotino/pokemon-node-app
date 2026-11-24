import { chatbotConnector } from "../connectors";
import { CHATBOT_TOKEN_EXPIRY_MARGIN_MS } from "../constants";
import { ChatbotTokenResponse, IChatbotTokens } from "../types/chatbot";

export default class ChatbotAuthRepository {
    static #tokens?: IChatbotTokens;
    static #pendingAuth?: Promise<IChatbotTokens>;

    static async getTokens(): Promise<IChatbotTokens> {
        const tokens = ChatbotAuthRepository.#tokens;
        if (tokens != null && ChatbotAuthRepository.#isValid(tokens)) {
            return tokens;
        }
        ChatbotAuthRepository.#pendingAuth ??=
            ChatbotAuthRepository.#authenticate(tokens).finally(() => {
                ChatbotAuthRepository.#pendingAuth = undefined;
            });
        return ChatbotAuthRepository.#pendingAuth;
    }

    static invalidate(rejected: IChatbotTokens) {
        if (
            ChatbotAuthRepository.#tokens?.accessToken === rejected.accessToken
        ) {
            ChatbotAuthRepository.#tokens = undefined;
        }
    }

    static async #authenticate(
        current?: IChatbotTokens,
    ): Promise<IChatbotTokens> {
        const tokens =
            current == null
                ? await ChatbotAuthRepository.#exchangeApiKey()
                : await ChatbotAuthRepository.#refreshTokens(current).catch(
                      () => ChatbotAuthRepository.#exchangeApiKey(),
                  );
        ChatbotAuthRepository.#tokens = tokens;
        return tokens;
    }

    static async #exchangeApiKey(): Promise<IChatbotTokens> {
        const response = (await chatbotConnector.client
            .post("v1/auth/api-key/token", {
                timeout: 5_000,
                json: { apiKey: chatbotConnector.apiKey },
            })
            .json()) as ChatbotTokenResponse;
        return ChatbotAuthRepository.#toTokens(response);
    }

    static async #refreshTokens(
        current: IChatbotTokens,
    ): Promise<IChatbotTokens> {
        const response = (await chatbotConnector.client
            .post("v1/auth/api-key/refresh", {
                timeout: 5_000,
                json: {
                    refreshToken: current.refreshToken,
                    chatbotId: current.chatbotId,
                },
            })
            .json()) as ChatbotTokenResponse;
        return ChatbotAuthRepository.#toTokens(response);
    }

    static #isValid(tokens: IChatbotTokens) {
        return tokens.expiresAt - CHATBOT_TOKEN_EXPIRY_MARGIN_MS > Date.now();
    }

    static #toTokens(response: ChatbotTokenResponse): IChatbotTokens {
        return {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            chatbotId: response.chatbotId,
            expiresAt: Date.now() + response.expiresIn * 1_000,
        };
    }
}
