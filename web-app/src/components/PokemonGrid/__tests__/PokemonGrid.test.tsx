import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { bulbasaur, typeFacets } from "../../../test/fixtures";
import type { IPokemon } from "../../../types/pokemon";
import { PokemonGrid } from "../PokemonGrid";

const SIZE = 3;
const TOTAL = 7;

function buildItems(from: number, count: number): IPokemon[] {
    return Array.from({ length: count }, (_, index) => ({
        ...bulbasaur,
        id: from + index + 1,
        pokedexId: from + index + 1,
        name: `pokemon-${from + index + 1}`,
    }));
}

let requests: URL[] = [];

const server = setupServer(
    http.get("*/api/pokemons", ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const from = Number(url.searchParams.get("from"));
        return HttpResponse.json({
            pokemons: {
                from,
                size: SIZE,
                total: TOTAL,
                items: buildItems(
                    from,
                    Math.max(0, Math.min(SIZE, TOTAL - from)),
                ),
                filters: typeFacets,
            },
        });
    }),
);

function firstPageRequests(): URL[] {
    return requests.filter(url => url.searchParams.get("from") === "0");
}

function renderGrid() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={client}>
            <PokemonGrid size={SIZE} />
        </QueryClientProvider>,
    );
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
    server.resetHandlers();
    requests = [];
    window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

describe("PokemonGrid", () => {
    it("shows skeletons, then the cards of the current page", async () => {
        renderGrid();

        expect(screen.getAllByTestId("card-skeleton")).toHaveLength(SIZE);
        expect(screen.getByRole("region", { name: "Pokémon" })).toHaveAttribute(
            "aria-busy",
            "true",
        );

        expect(await screen.findAllByRole("article")).toHaveLength(SIZE);
        expect(
            screen.getByRole("heading", { name: "pokemon-1" }),
        ).toBeInTheDocument();
        expect(screen.queryByTestId("card-skeleton")).not.toBeInTheDocument();
    });

    it("loads the page read from the URL", async () => {
        window.history.replaceState(null, "", "/?page=2");
        renderGrid();

        expect(
            await screen.findByRole("heading", { name: "pokemon-4" }),
        ).toBeInTheDocument();
    });

    it("shows an error and retries on demand", async () => {
        server.use(
            http.get(
                "*/api/pokemons",
                () => new HttpResponse(null, { status: 500 }),
                { once: true },
            ),
        );
        renderGrid();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Unable to load Pokémon.",
        );

        await userEvent.click(screen.getByRole("button", { name: "Retry" }));

        expect(await screen.findAllByRole("article")).toHaveLength(SIZE);
    });

    it("shows a message when there is no result", async () => {
        server.use(
            http.get("*/api/pokemons", () =>
                HttpResponse.json({
                    pokemons: { from: 0, size: SIZE, total: 0, items: [] },
                }),
            ),
        );
        renderGrid();

        expect(
            await screen.findByText("No Pokemon found."),
        ).toBeInTheDocument();
    });

    it("navigates to another page, scrolls back to the top and focuses the grid", async () => {
        renderGrid();
        await screen.findByRole("heading", { name: "pokemon-1" });

        await userEvent.click(screen.getByRole("button", { name: "Page 2" }));

        expect(window.location.search).toBe("?page=2");
        expect(
            await screen.findByRole("heading", { name: "pokemon-4" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(window.scrollTo).toHaveBeenCalledWith(
            expect.objectContaining({ top: 0 }),
        );
        expect(screen.getByRole("region", { name: "Pokémon" })).toHaveFocus();
    });

    it("hides the pagination when everything fits on one page", async () => {
        server.use(
            http.get("*/api/pokemons", () =>
                HttpResponse.json({
                    pokemons: {
                        from: 0,
                        size: SIZE,
                        total: 2,
                        items: buildItems(0, 2),
                    },
                }),
            ),
        );
        renderGrid();

        expect(await screen.findAllByRole("article")).toHaveLength(2);
        expect(
            screen.queryByRole("navigation", { name: "Pagination" }),
        ).not.toBeInTheDocument();
    });

    it("redirects to the last page when the page is out of range", async () => {
        window.history.replaceState(null, "", "/?page=99");
        renderGrid();

        await waitFor(() => expect(window.location.search).toBe("?page=3"));
        expect(
            await screen.findByRole("heading", { name: "pokemon-7" }),
        ).toBeInTheDocument();
    });
});

describe("PokemonGrid search and type filter", () => {
    it("shows the type chips from the page response without an extra request", async () => {
        renderGrid();

        expect(
            await screen.findByRole("button", { name: "Feu 9" }),
        ).toBeInTheDocument();
        expect(screen.getByText(`${TOTAL} Pokémon`)).toBeInTheDocument();
        await waitFor(() => expect(requests).toHaveLength(2));
        expect(firstPageRequests()).toHaveLength(1);
    });

    it("searches on submit only and goes back to the first page", async () => {
        window.history.replaceState(null, "", "/?page=2");
        renderGrid();
        await screen.findByRole("heading", { name: "pokemon-4" });
        const input = screen.getByRole("searchbox");

        await userEvent.type(input, "pika");
        expect(requests.some(url => url.searchParams.has("q"))).toBe(false);

        await userEvent.keyboard("{Enter}");

        expect(window.location.search).toBe("?q=pika");
        expect(
            await screen.findByRole("heading", { name: "pokemon-1" }),
        ).toBeInTheDocument();
        const searched = firstPageRequests().filter(
            url => url.searchParams.get("q") === "pika",
        );
        expect(searched).toHaveLength(1);
        expect(input).toHaveFocus();
    });

    it("combines selected types and keeps the chips stable", async () => {
        renderGrid();

        await userEvent.click(
            await screen.findByRole("button", { name: "Feu 9" }),
        );
        await userEvent.click(screen.getByRole("button", { name: "Vol 7" }));

        expect(window.location.search).toBe("?types=Feu&types=Vol");
        await waitFor(() =>
            expect(
                firstPageRequests().some(
                    url =>
                        url.searchParams.getAll("types").join() === "Feu,Vol",
                ),
            ).toBe(true),
        );
        expect(screen.getByRole("button", { name: "Feu 9" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(
            screen.getByRole("button", { name: "Plante 12" }),
        ).toHaveAttribute("aria-pressed", "false");
    });

    it("offers to clear the filters when nothing matches", async () => {
        server.use(
            http.get("*/api/pokemons", ({ request }) => {
                const url = new URL(request.url);
                const filtered = url.searchParams.has("q");
                return HttpResponse.json({
                    pokemons: {
                        from: 0,
                        size: SIZE,
                        total: filtered ? 0 : 2,
                        items: filtered ? [] : buildItems(0, 2),
                        filters: filtered
                            ? [{ name: "Feu", count: 0 }]
                            : typeFacets,
                    },
                });
            }),
        );
        window.history.replaceState(null, "", "/?q=zzz&types=Feu");
        renderGrid();

        expect(
            await screen.findByText("No Pokemon found."),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Feu 0" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );

        await userEvent.click(
            screen.getByRole("button", { name: "Clear search and filters" }),
        );

        expect(window.location.search).toBe("");
        expect(await screen.findAllByRole("article")).toHaveLength(2);
        expect(screen.getByRole("searchbox")).toHaveValue("");
    });

    it("restores the search field on browser navigation", async () => {
        renderGrid();
        await screen.findByRole("heading", { name: "pokemon-1" });

        await userEvent.type(screen.getByRole("searchbox"), "pika{Enter}");
        expect(window.location.search).toBe("?q=pika");

        act(() => {
            window.history.replaceState(null, "", "/?q=bulb");
            window.dispatchEvent(new PopStateEvent("popstate"));
        });

        expect(screen.getByRole("searchbox")).toHaveValue("bulb");
    });
});
