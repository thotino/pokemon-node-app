import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pokemon } from "../../entities/Pokemon";
import { PokemonPage } from "../../entities/PokemonPage";
import { bulbasaur, typeFacets } from "../../test/fixtures";
import { PokemonApiRepository } from "../PokemonApiRepository";

const PAGE_SIZE = PokemonApiRepository.DEFAULT_PAGE_SIZE;

describe("PokemonApiRepository.pageToOffset", () => {
    it.each([
        [1, 20, 0],
        [2, 20, 20],
        [3, 10, 20],
    ])("page %i, size %i -> from %i", (page, size, expected) => {
        expect(PokemonApiRepository.pageToOffset(page, size)).toBe(expected);
    });

    it.each([0, -3, 1.5, Number.NaN])(
        "treats invalid page %s as page 1",
        page => {
            expect(PokemonApiRepository.pageToOffset(page, 20)).toBe(0);
        },
    );
});

describe("PokemonApiRepository.getPage", () => {
    let lastUrl: URL | undefined;
    const server = setupServer(
        http.get("*/api/pokemons", ({ request }) => {
            lastUrl = new URL(request.url);
            return HttpResponse.json({
                pokemons: {
                    from: PAGE_SIZE,
                    size: PAGE_SIZE,
                    total: 100,
                    items: [bulbasaur],
                    filters: [],
                },
            });
        }),
    );

    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => {
        server.resetHandlers();
        lastUrl = undefined;
    });
    afterAll(() => server.close());

    it("calls /api/pokemons with from/size and returns a PokemonPage", async () => {
        const result = await PokemonApiRepository.getPage({ page: 2 });

        expect(lastUrl?.pathname).toBe("/api/pokemons");
        expect(lastUrl?.searchParams.get("from")).toBe(String(PAGE_SIZE));
        expect(lastUrl?.searchParams.get("size")).toBe(String(PAGE_SIZE));
        expect(result).toBeInstanceOf(PokemonPage);
        expect(result.items[0]).toBeInstanceOf(Pokemon);
        expect(result.items[0].name).toBe("Bulbizarre");
        expect(result.page).toBe(2);
        expect(result.totalPages).toBe(5);
    });

    it("falls back to safe values for invalid params", async () => {
        await PokemonApiRepository.getPage({ page: Number.NaN, size: 0 });

        expect(lastUrl?.searchParams.get("from")).toBe("0");
        expect(lastUrl?.searchParams.get("size")).toBe(String(PAGE_SIZE));
    });

    it("sends the keywords and one types param per selected type", async () => {
        await PokemonApiRepository.getPage({
            page: 1,
            q: "  pika ",
            types: ["Feu", "", "Vol"],
        });

        expect(lastUrl?.searchParams.get("q")).toBe("pika");
        expect(lastUrl?.searchParams.getAll("types")).toEqual(["Feu", "Vol"]);
    });

    it("omits empty keywords and types", async () => {
        await PokemonApiRepository.getPage({ page: 1, q: "   ", types: [] });

        expect(lastUrl?.searchParams.has("q")).toBe(false);
        expect(lastUrl?.searchParams.has("types")).toBe(false);
    });

    it("maps the filters to type facets", async () => {
        server.use(
            http.get("*/api/pokemons", () =>
                HttpResponse.json({
                    pokemons: {
                        from: 0,
                        size: PAGE_SIZE,
                        total: 1,
                        items: [bulbasaur],
                        filters: typeFacets,
                    },
                }),
            ),
        );

        const result = await PokemonApiRepository.getPage({ page: 1 });

        expect(result.filters.map(({ name, count }) => [name, count])).toEqual([
            ["Plante", 12],
            ["Feu", 9],
            ["Vol", 7],
        ]);
    });

    it("returns no facet when filters are missing", async () => {
        server.use(
            http.get("*/api/pokemons", () =>
                HttpResponse.json({
                    pokemons: { from: 0, size: PAGE_SIZE, total: 0, items: [] },
                }),
            ),
        );

        const result = await PokemonApiRepository.getPage({ page: 1 });

        expect(result.filters).toEqual([]);
    });

    it("rejects on HTTP errors", async () => {
        server.use(
            http.get(
                "*/api/pokemons",
                () => new HttpResponse(null, { status: 500 }),
            ),
        );

        await expect(
            PokemonApiRepository.getPage({ page: 1 }),
        ).rejects.toThrow();
    });
});
