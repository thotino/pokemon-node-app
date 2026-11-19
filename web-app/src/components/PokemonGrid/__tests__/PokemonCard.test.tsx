import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pokemon } from "../../../entities/Pokemon";
import { bulbasaur } from "../../../test/fixtures";
import { CardSkeleton } from "../CardSkeleton";
import { PokemonCard } from "../PokemonCard";

describe("PokemonCard", () => {
    const pokemon = new Pokemon(bulbasaur);

    it("renders the name, number, types and image", () => {
        render(<PokemonCard pokemon={pokemon} />);

        const card = screen.getByRole("article", { name: "Bulbizarre" });
        expect(
            within(card).getByRole("heading", { name: "Bulbizarre" }),
        ).toBeInTheDocument();
        expect(within(card).getByText("#001")).toBeInTheDocument();
        expect(
            within(card).getByRole("img", { name: "Plante" }),
        ).toBeInTheDocument();
        expect(
            within(card).getByRole("img", { name: "Bulbizarre" }),
        ).toHaveAttribute("loading", "lazy");
    });

    it("renders only the 4 main stats", () => {
        render(<PokemonCard pokemon={pokemon} />);

        const terms = screen.getAllByRole("term").map(term => term.textContent);
        expect(terms).toEqual(["HP", "Attack", "Defense", "Speed"]);
        expect(screen.queryByText("special_attack")).not.toBeInTheDocument();
    });

    it("shows a placeholder when the image fails to load", () => {
        render(<PokemonCard pokemon={pokemon} />);

        fireEvent.error(screen.getByRole("img", { name: "Bulbizarre" }));

        const placeholder = screen.getByRole("img", { name: "Bulbizarre" });
        expect(placeholder.tagName).toBe("DIV");
    });
});

describe("PokemonCard battle selection", () => {
    const pokemon = new Pokemon(bulbasaur);

    it("has no battle button without handler", () => {
        render(<PokemonCard pokemon={pokemon} />);

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("adds the pokemon to the battle", async () => {
        const onToggleSelect = vi.fn();
        render(
            <PokemonCard pokemon={pokemon} onToggleSelect={onToggleSelect} />,
        );

        await userEvent.click(
            screen.getByRole("button", { name: "Add to battle" }),
        );

        expect(onToggleSelect).toHaveBeenCalledWith(pokemon);
    });

    it("offers to remove a selected pokemon even when the team is full", () => {
        render(
            <PokemonCard
                pokemon={pokemon}
                isSelected
                canSelect={false}
                onToggleSelect={vi.fn()}
            />,
        );

        expect(
            screen.getByRole("button", { name: "Remove from battle" }),
        ).toBeEnabled();
    });

    it("disables the button when the team is full", () => {
        render(
            <PokemonCard
                pokemon={pokemon}
                canSelect={false}
                onToggleSelect={vi.fn()}
            />,
        );

        expect(
            screen.getByRole("button", { name: "Add to battle" }),
        ).toBeDisabled();
    });
});

describe("CardSkeleton", () => {
    it("is hidden from assistive technologies", () => {
        render(<CardSkeleton />);

        expect(screen.getByTestId("card-skeleton")).toHaveAttribute(
            "aria-hidden",
            "true",
        );
    });
});
