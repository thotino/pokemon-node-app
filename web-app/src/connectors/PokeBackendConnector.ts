import ky, { type KyInstance } from "ky";
import { BaseConnectorInterface } from "../types/connector";

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
    async connect() {}
    async close() {}
}

export const pokeBackendConnector = new PokeBackendConnector();
