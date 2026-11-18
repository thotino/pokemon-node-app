import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

describe("CardSkeleton", () => {
    it("is hidden from assistive technologies", () => {
        render(<CardSkeleton />);

        expect(screen.getByTestId("card-skeleton")).toHaveAttribute(
            "aria-hidden",
            "true",
        );
    });
});
