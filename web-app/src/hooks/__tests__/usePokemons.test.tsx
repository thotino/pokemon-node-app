import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PokemonQueries } from "../../services/PokemonQueries";
import { bulbasaur } from "../../test/fixtures";
import { usePageParam } from "../usePageParam";
import { usePokemons } from "../usePokemons";
import { useSearchCriteria } from "../useSearchCriteria";

const SIZE = 20;
const TOTAL = 45;

const server = setupServer(
    http.get("*/api/pokemons", ({ request }) => {
        const from = Number(new URL(request.url).searchParams.get("from"));
        return HttpResponse.json({
            pokemons: {
                from,
                size: SIZE,
                total: TOTAL,
                items: [
                    { ...bulbasaur, id: from + 1, name: `pokemon-${from + 1}` },
                ],
            },
        });
    }),
);

function createWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, wrapper };
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
    server.resetHandlers();
    window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

describe("usePokemons", () => {
    it("loads the requested page", async () => {
        const { wrapper } = createWrapper();
        const { result } = renderHook(() => usePokemons(2, SIZE), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.page).toBe(2);
        expect(result.current.data?.totalPages).toBe(3);
        expect(result.current.data?.items[0].name).toBe("pokemon-21");
    });

    it("prefetches the next page", async () => {
        const { client, wrapper } = createWrapper();
        renderHook(() => usePokemons(1, SIZE), { wrapper });

        await waitFor(() =>
            expect(
                client.getQueryData(PokemonQueries.pageKey(2, SIZE)),
            ).toBeDefined(),
        );
    });

    it("loads and prefetches with the search criteria", async () => {
        const criteria = { q: "pika", types: ["Feu", "Vol"] };
        const urls: URL[] = [];
        server.events.on("request:start", ({ request }) => {
            urls.push(new URL(request.url));
        });
        const { client, wrapper } = createWrapper();
        renderHook(() => usePokemons(1, SIZE, criteria), { wrapper });

        await waitFor(() =>
            expect(
                client.getQueryData(PokemonQueries.pageKey(2, SIZE, criteria)),
            ).toBeDefined(),
        );
        server.events.removeAllListeners();

        expect(urls).toHaveLength(2);
        urls.forEach(url => {
            expect(url.searchParams.get("q")).toBe("pika");
            expect(url.searchParams.getAll("types")).toEqual(["Feu", "Vol"]);
        });
    });

    it("does not prefetch past the last page", async () => {
        const { client, wrapper } = createWrapper();
        const { result } = renderHook(() => usePokemons(3, SIZE), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(
            client.getQueryState(PokemonQueries.pageKey(4, SIZE)),
        ).toBeUndefined();
    });

    it("keeps the previous page while the next one loads", async () => {
        const { wrapper } = createWrapper();
        const { result, rerender } = renderHook(
            ({ page }) => usePokemons(page, SIZE),
            {
                wrapper,
                initialProps: { page: 1 },
            },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        server.use(
            http.get("*/api/pokemons", async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return HttpResponse.json({
                    pokemons: { from: 40, size: SIZE, total: TOTAL, items: [] },
                });
            }),
        );
        rerender({ page: 3 });

        expect(result.current.isPlaceholderData).toBe(true);
        expect(result.current.data?.page).toBe(1);
        await waitFor(() => expect(result.current.data?.page).toBe(3));
    });

    it("exposes errors", async () => {
        server.use(
            http.get(
                "*/api/pokemons",
                () => new HttpResponse(null, { status: 500 }),
            ),
        );
        const { wrapper } = createWrapper();
        const { result } = renderHook(() => usePokemons(1, SIZE), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe("useSearchCriteria", () => {
    it("reads the criteria from the URL and keeps a stable reference", () => {
        window.history.replaceState(null, "", "/?q=pika&types=Vol");
        const { result, rerender } = renderHook(() => useSearchCriteria());
        const first = result.current[0];

        rerender();

        expect(first).toEqual({ q: "pika", types: ["Vol"] });
        expect(result.current[0]).toBe(first);
    });

    it("updates the URL and resets the page", () => {
        window.history.replaceState(null, "", "/?page=3");
        const { result } = renderHook(() => useSearchCriteria());

        act(() => result.current[1]({ q: "", types: ["Feu"] }));

        expect(result.current[0]).toEqual({ q: "", types: ["Feu"] });
        expect(window.location.search).toBe("?types=Feu");
    });
});

describe("usePageParam", () => {
    it("syncs the page with the URL", () => {
        window.history.replaceState(null, "", "/?page=2");
        const { result } = renderHook(() => usePageParam());

        expect(result.current[0]).toBe(2);

        act(() => result.current[1](4));

        expect(result.current[0]).toBe(4);
        expect(window.location.search).toBe("?page=4");
    });
});
