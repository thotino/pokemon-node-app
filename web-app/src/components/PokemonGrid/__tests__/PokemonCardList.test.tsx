import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pokemon } from "../../../entities/Pokemon";
import { bulbasaur } from "../../../test/fixtures";
import { PokemonCardList } from "../PokemonCardList";

describe("PokemonCardList", () => {
    it("renders one list item and card per pokemon, in order", () => {
        const pokemons = [1, 2, 3].map(
            id =>
                new Pokemon({
                    ...bulbasaur,
                    id,
                    pokedexId: id,
                    name: `pokemon-${id}`,
                }),
        );

        render(<PokemonCardList pokemons={pokemons} />);

        const cards = screen.getAllByRole("article");
        expect(
            cards.map(card => within(card).getByRole("heading").textContent),
        ).toEqual(["pokemon-1", "pokemon-2", "pokemon-3"]);
        cards.forEach(card => expect(card.parentElement?.tagName).toBe("LI"));
    });

    it("renders an empty list without pokemon", () => {
        render(<PokemonCardList pokemons={[]} />);

        expect(screen.getByRole("list")).toBeEmptyDOMElement();
    });
});
