import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PokemonTypeFacet } from "../../entities/PokemonTypeFacet";
import { typeFacets } from "../../test/fixtures";
import { TypeFilter } from "../TypeFilter";

const facets = typeFacets.map(facet => new PokemonTypeFacet(facet));

describe("TypeFilter", () => {
    it("renders a chip per type with its count and pressed state", () => {
        render(
            <TypeFilter
                facets={facets}
                selected={["Feu"]}
                onToggle={vi.fn()}
            />,
        );

        const list = screen.getByRole("list", { name: "Filter by type" });
        expect(list.querySelectorAll("button")).toHaveLength(3);
        expect(screen.getByRole("button", { name: "Feu 9" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(
            screen.getByRole("button", { name: "Plante 12" }),
        ).toHaveAttribute("aria-pressed", "false");
    });

    it("toggles a type on click", async () => {
        const onToggle = vi.fn();
        render(
            <TypeFilter facets={facets} selected={[]} onToggle={onToggle} />,
        );

        await userEvent.click(screen.getByRole("button", { name: "Vol 7" }));

        expect(onToggle).toHaveBeenCalledExactlyOnceWith("Vol");
    });

    it("shows a skeleton while the facets load", () => {
        render(
            <TypeFilter
                facets={[]}
                selected={[]}
                onToggle={vi.fn()}
                isLoading
            />,
        );

        expect(screen.getByTestId("type-filter-skeleton")).toBeInTheDocument();
    });

    it("renders nothing without facets once loaded", () => {
        const { container } = render(
            <TypeFilter facets={[]} selected={[]} onToggle={vi.fn()} />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
