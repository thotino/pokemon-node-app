import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import App from "../App";
import { bulbasaur } from "../test/fixtures";

const server = setupServer(
    http.get("*/api/pokemons", () =>
        HttpResponse.json({
            pokemons: { from: 0, size: 20, total: 45, items: [bulbasaur] },
        }),
    ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("App", () => {
    it("renders the header, the pokemon grid and the pagination", async () => {
        render(<App />);

        expect(
            screen.getByRole("heading", { level: 1, name: "PokeBattle" }),
        ).toBeInTheDocument();
        expect(
            await screen.findByRole("article", { name: "Bulbizarre" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("navigation", { name: "Pagination" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Page 3" }),
        ).toBeInTheDocument();
    });
});
