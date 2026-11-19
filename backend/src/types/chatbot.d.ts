import { Readable } from "node:stream";

export type ChatbotConnectorParams = {
    url: string;
    apiKey: string;
};

export type ChatbotRetrySettings = {
    limit: number;
    maxRetryAfterMs: number;
    backoffLimitMs: number;
};

export type ChatbotTokenRequest = {
    apiKey: string;
};

export type ChatbotRefreshRequest = {
    refreshToken: string;
    chatbotId: string;
};

export type ChatbotTokenResponse = {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    chatbotId: string;
};

export interface IChatbotTokens {
    accessToken: string;
    refreshToken: string;
    chatbotId: string;
    expiresAt: number;
}

export type ChatbotQueryRequest = {
    query: string;
};

export type ChatbotQueryResult = {
    sessionId?: string;
    stream: Readable;
};
