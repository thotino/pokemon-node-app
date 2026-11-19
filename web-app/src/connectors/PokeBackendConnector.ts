import ky, { type KyInstance } from "ky";
import type { BaseConnectorInterface } from "../types/connector";
import type { StreamRequestOptions } from "../types/stream-request";

export interface RequestOptions {
    searchParams?: Record<string, string | number> | URLSearchParams;
    signal?: AbortSignal;
}

export class PokeBackendConnector implements BaseConnectorInterface {
    readonly #client: KyInstance;

    constructor(baseUrl = "/api/", timeout = 10_000) {
        this.#client = ky.create({
            baseUrl: new URL(baseUrl, globalThis.location.href).href,
            timeout,
            retry: 0,
            headers: { Accept: "application/json" },
        });
    }

    get<T>(
        path: string,
        { searchParams, signal }: RequestOptions = {},
    ): Promise<T> {
        return this.#client.get(path, { searchParams, signal }).json<T>();
    }

    postStream(
        path: string,
        json: unknown,
        { signal, timeout }: StreamRequestOptions = {},
    ): Promise<Response> {
        return this.#client.post(path, {
            json,
            signal,
            timeout,
            headers: { Accept: "text/plain" },
        });
    }
    async connect() {}
    async close() {}
}

export const pokeBackendConnector = new PokeBackendConnector();
