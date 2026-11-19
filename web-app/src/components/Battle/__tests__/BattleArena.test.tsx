import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { Pokemon } from "../../../entities/Pokemon";
import { bulbasaur, charmander } from "../../../test/fixtures";
import { textStream } from "../../../test/streams";
import { BattleArena } from "../BattleArena";
import { BattleSelectionProvider } from "../BattleSelectionProvider";

const fighters = [new Pokemon(bulbasaur), new Pokemon(charmander)];

const server = setupServer(
    http.post(
        "*/api/battles",
        () =>
            new HttpResponse(
                textStream([
                    "Tour 1 : Bulbizarre lance Fouet Lianes.\n",
                    "Tour 2 : Salamèche riposte avec Flammèche.\n",
                    "VAINQUEUR : Salamèche",
                ]),
                { headers: { "Content-Type": "text/plain; charset=utf-8" } },
            ),
    ),
);

function renderArena(initialFighters: Pokemon[] = fighters) {
    const onBack = vi.fn();
    render(
        <BattleSelectionProvider initialFighters={initialFighters}>
            <BattleArena onBack={onBack} />
        </BattleSelectionProvider>,
    );
    return onBack;
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("BattleArena", () => {
    it("tells the battle and announces the winner", async () => {
        renderArena();

        expect(
            screen.getByRole("article", { name: "Bulbizarre" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("article", { name: "Salamèche" }),
        ).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole("button", { name: "Start the battle" }),
        );

        const narration = await screen.findByRole("region", {
            name: "Battle narration",
        });
        expect(
            await within(screen.getByRole("status")).findByText("Salamèche"),
        ).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent(
            "Winner: Salamèche",
        );
        expect(narration).toHaveTextContent("Tour 1 : Bulbizarre");
        expect(narration).toHaveTextContent("Tour 2 : Salamèche riposte");
        expect(narration).not.toHaveTextContent("VAINQUEUR");
        expect(narration).toHaveAttribute("aria-busy", "false");
        expect(
            screen.getByRole("button", { name: "Fight again" }),
        ).toBeInTheDocument();
    });

    it("says when no winner was announced", async () => {
        server.use(
            http.post(
                "*/api/battles",
                () =>
                    new HttpResponse(textStream(["Match nul."]), {
                        headers: { "Content-Type": "text/plain" },
                    }),
            ),
        );
        renderArena();

        await userEvent.click(
            screen.getByRole("button", { name: "Start the battle" }),
        );

        expect(
            await screen.findByText("No winner was announced."),
        ).toBeInTheDocument();
    });

    it("shows the error and blocks the retry during Retry-After", async () => {
        server.use(
            http.post("*/api/battles", () =>
                HttpResponse.json(
                    {
                        code: "ERR_CHATBOT_RATE_LIMITED",
                        message: "Rate limited",
                        value: null,
                    },
                    { status: 429, headers: { "Retry-After": "60" } },
                ),
            ),
        );
        renderArena();

        await userEvent.click(
            screen.getByRole("button", { name: "Start the battle" }),
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "The arena is busy, try again in 60 s.",
        );
        expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
    });

    it("asks for 2 fighters when the selection is incomplete", async () => {
        const onBack = renderArena([new Pokemon(bulbasaur)]);

        expect(
            screen.getByText("Pick 2 Pokémon to start a battle."),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Start the battle" }),
        ).not.toBeInTheDocument();

        await userEvent.click(
            screen.getByRole("button", { name: "Back to the Pokédex" }),
        );

        expect(onBack).toHaveBeenCalledOnce();
    });
});
