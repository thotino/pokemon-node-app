import type { BattleErrorOptions, ServiceErrorInterface } from "../types/error";

export class BattleError extends Error implements ServiceErrorInterface {
    static readonly NETWORK = "ERR_NETWORK";
    static readonly STREAM_INTERRUPTED = "ERR_STREAM_INTERRUPTED";
    static readonly UNKNOWN = "ERR_UNKNOWN";

    readonly code: string;
    readonly value: unknown | null;
    readonly status?: number;
    readonly retryAfterSeconds?: number;
    readonly cause: unknown;

    constructor(
        code: string,
        {
            status,
            message,
            value,
            retryAfterSeconds,
            cause,
        }: BattleErrorOptions = {},
    ) {
        super(message ?? code);
        this.name = "BattleError";
        this.code = code;
        this.value = value ?? null;
        this.status = status;
        this.retryAfterSeconds = retryAfterSeconds;
        this.cause = cause;
    }

    static from(error: unknown): BattleError {
        return error instanceof BattleError
            ? error
            : new BattleError(BattleError.UNKNOWN, { cause: error });
    }

    get missingIds(): string[] {
        return Array.isArray(this.value) ? this.value.map(String) : [];
    }

    get userMessage(): string {
        if (this.status === 404) {
            const ids = this.missingIds;
            return ids.length === 0
                ? "Pokémon not found."
                : `Pokémon not found: ${ids.join(", ")}.`;
        }
        if (this.status === 429) {
            return this.retryAfterSeconds == null
                ? "The arena is busy, try again later."
                : `The arena is busy, try again in ${this.retryAfterSeconds} s.`;
        }
        if (this.status === 400) {
            return "This battle request is invalid.";
        }
        if (this.code === BattleError.STREAM_INTERRUPTED) {
            return "The battle was interrupted.";
        }
        return "The battle could not take place.";
    }
}
