import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import App from "../App";
import { bulbasaur, charmander } from "../test/fixtures";
import { textStream } from "../test/streams";

const server = setupServer(
    http.get("*/api/pokemons", () =>
        HttpResponse.json({
            pokemons: {
                from: 0,
                size: 20,
                total: 45,
                items: [bulbasaur, charmander],
            },
        }),
    ),
    http.post(
        "*/api/battles",
        () =>
            new HttpResponse(
                textStream(["Bulbizarre gagne.\n", "VAINQUEUR: Bulbizarre"]),
                { headers: { "Content-Type": "text/plain; charset=utf-8" } },
            ),
    ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => window.history.replaceState(null, "", "/"));
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

    it("selects two fighters, opens the arena and tells the battle", async () => {
        render(<App />);
        await screen.findByRole("article", { name: "Bulbizarre" });

        for (const button of screen.getAllByRole("button", {
            name: "Add to battle",
        })) {
            await userEvent.click(button);
        }
        await userEvent.click(
            screen.getByRole("button", { name: "Go to the arena" }),
        );

        expect(window.location.search).toBe("?view=battle");
        expect(
            screen.queryByRole("complementary", { name: "Battle team" }),
        ).not.toBeInTheDocument();

        await userEvent.click(
            screen.getByRole("button", { name: "Start the battle" }),
        );

        expect(await screen.findByText("Winner:")).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole("button", { name: "Back to the Pokédex" }),
        );

        expect(window.location.search).toBe("");
        expect(
            screen.getByRole("complementary", { name: "Battle team" }),
        ).toBeInTheDocument();
    });
});
