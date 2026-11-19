import { HTTPError } from "ky";
import { pokeBackendConnector } from "../connectors/PokeBackendConnector";
import { BATTLE_TIMEOUT_MS } from "../constants";
import { BattleError } from "../entities/BattleError";
import type { BattleStart } from "../types/battle";
import type { ServiceErrorInterface } from "../types/error";

export class BattleApiRepository {
    static async start(
        pokemonIds: string[],
        signal: AbortSignal,
    ): Promise<BattleStart> {
        let response: Response;
        try {
            response = await pokeBackendConnector.postStream(
                "battles",
                { pokemonIds },
                { signal, timeout: BATTLE_TIMEOUT_MS },
            );
        } catch (error) {
            throw BattleApiRepository.#toBattleError(error, signal);
        }
        return {
            sessionId: response.headers.get("X-Session-Id") ?? undefined,
            chunks: BattleApiRepository.#decode(response, signal),
        };
    }

    static async *#decode(
        response: Response,
        signal: AbortSignal,
    ): AsyncGenerator<string> {
        if (response.body == null) {
            return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                const text = decoder.decode(value, { stream: true });
                if (text !== "") {
                    yield text;
                }
            }
            const rest = decoder.decode();
            if (rest !== "") {
                yield rest;
            }
        } catch (error) {
            if (signal.aborted) {
                throw error;
            }
            throw new BattleError(BattleError.STREAM_INTERRUPTED, {
                cause: error,
            });
        } finally {
            reader.releaseLock();
        }
    }

    static #toBattleError(error: unknown, signal: AbortSignal) {
        if (signal.aborted) {
            return error;
        }
        if (error instanceof HTTPError) {
            const body = BattleApiRepository.#readBody(error.data);
            return new BattleError(
                body?.code ?? `ERR_HTTP_${error.response.status}`,
                {
                    status: error.response.status,
                    message: body?.message,
                    value: body?.value,
                    retryAfterSeconds: BattleApiRepository.#parseRetryAfter(
                        error.response.headers.get("Retry-After"),
                    ),
                    cause: error,
                },
            );
        }
        return new BattleError(BattleError.NETWORK, { cause: error });
    }

    static #readBody(data: unknown): ServiceErrorInterface | undefined {
        return data != null &&
            typeof data === "object" &&
            typeof (data as ServiceErrorInterface).code === "string"
            ? (data as ServiceErrorInterface)
            : undefined;
    }

    static #parseRetryAfter(header: string | null): number | undefined {
        if (header == null || header.trim() === "") {
            return undefined;
        }
        const seconds = Number(header);
        if (Number.isFinite(seconds)) {
            return Math.max(0, Math.ceil(seconds));
        }
        const date = Date.parse(header);
        return Number.isNaN(date)
            ? undefined
            : Math.max(0, Math.ceil((date - Date.now()) / 1000));
    }
}
