import { pokeApiConnector } from "../connectors";

export default class PokeResourceRepository {
    static #requests = new Map<string, Promise<unknown>>();

    static get<T>(url: string): Promise<T> {
        const pending = PokeResourceRepository.#requests.get(url);
        if (pending != null) {
            return pending as Promise<T>;
        }
        const request = pokeApiConnector.client
            .get<T>(url)
            .json()
            .catch((error: unknown) => {
                PokeResourceRepository.#requests.delete(url);
                throw error;
            });
        PokeResourceRepository.#requests.set(url, request);
        return request;
    }

    static clear(): void {
        PokeResourceRepository.#requests.clear();
    }
}
