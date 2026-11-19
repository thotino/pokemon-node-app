export interface ServiceErrorInterface {
    code: string;
    value?: unknown | null;
    message: string;
}

export interface BattleErrorOptions {
    status?: number;
    message?: string;
    value?: unknown;
    retryAfterSeconds?: number;
    cause?: unknown;
}
