import { BaseConnectorInterface } from "../types/connector";

export interface UpdateSearchParamOptions {
    replace?: boolean;
}

export type SearchParamValue = string | string[] | null;

export class BrowserHistoryConnector implements BaseConnectorInterface {
    readonly #listeners = new Set<() => void>();
    readonly #window: Window;

    constructor(win: Window = window) {
        this.#window = win;
    }

    subscribe = (listener: () => void): (() => void) => {
        this.#listeners.add(listener);
        this.#window.addEventListener("popstate", listener);
        return () => {
            this.#listeners.delete(listener);
            this.#window.removeEventListener("popstate", listener);
        };
    };

    getSearch = (): string => this.#window.location.search;

    getSearchParam(name: string): string | null {
        return new URLSearchParams(this.#window.location.search).get(name);
    }

    getSearchParams(name: string): string[] {
        return new URLSearchParams(this.#window.location.search).getAll(name);
    }

    setSearchParam(
        name: string,
        value: string | null,
        options: UpdateSearchParamOptions = {},
    ): void {
        this.setSearchParams({ [name]: value }, options);
    }

    setSearchParams(
        updates: Record<string, SearchParamValue>,
        { replace = false }: UpdateSearchParamOptions = {},
    ): void {
        const url = new URL(this.#window.location.href);
        for (const [name, value] of Object.entries(updates)) {
            url.searchParams.delete(name);
            const values = value === null ? [] : [value].flat();
            values.forEach(item => url.searchParams.append(name, item));
        }
        if (url.href === this.#window.location.href) {
            return;
        }

        const history = this.#window.history;
        if (replace) {
            history.replaceState(history.state, "", url);
        } else {
            history.pushState(history.state, "", url);
        }
        this.#listeners.forEach(listener => listener());
    }

    async connect() {}
    async close() {
        this.#listeners.forEach(listener =>
            this.#window.removeEventListener("popstate", listener),
        );
        this.#listeners.clear();
    }
}

export const browserHistoryConnector = new BrowserHistoryConnector();
