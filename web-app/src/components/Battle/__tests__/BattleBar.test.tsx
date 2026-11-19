import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pokemon } from "../../../entities/Pokemon";
import { bulbasaur, charmander } from "../../../test/fixtures";
import { BattleBar } from "../BattleBar";

function renderBar(fighters: Pokemon[]) {
    const handlers = { onRemove: vi.fn(), onClear: vi.fn(), onStart: vi.fn() };
    render(
        <BattleBar
            fighters={fighters}
            canStart={fighters.length === 2}
            {...handlers}
        />,
    );
    return handlers;
}

describe("BattleBar", () => {
    it("shows an empty slot and disables the arena with one fighter", () => {
        renderBar([new Pokemon(bulbasaur)]);

        expect(
            screen.getByRole("complementary", { name: "Battle team" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Bulbizarre")).toBeInTheDocument();
        expect(screen.getByText("Pick a Pokémon")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Go to the arena" }),
        ).toBeDisabled();
    });

    it("starts, removes and clears with two fighters", async () => {
        const first = new Pokemon(bulbasaur);
        const handlers = renderBar([first, new Pokemon(charmander)]);

        await userEvent.click(
            screen.getByRole("button", { name: "Go to the arena" }),
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Remove Bulbizarre" }),
        );
        await userEvent.click(screen.getByRole("button", { name: "Clear" }));

        expect(handlers.onStart).toHaveBeenCalledOnce();
        expect(handlers.onRemove).toHaveBeenCalledWith(first);
        expect(handlers.onClear).toHaveBeenCalledOnce();
    });
});
