import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "../SearchBar";

describe("SearchBar", () => {
    it("submits the trimmed value on Enter only", async () => {
        const onSubmit = vi.fn();
        render(<SearchBar value="" onSubmit={onSubmit} />);
        const input = screen.getByRole("searchbox", {
            name: "Search Pokémon by name",
        });

        await userEvent.type(input, "  pika ");
        expect(onSubmit).not.toHaveBeenCalled();

        await userEvent.keyboard("{Enter}");

        expect(onSubmit).toHaveBeenCalledExactlyOnceWith("pika");
        expect(input).toHaveFocus();
    });

    it("submits with the button", async () => {
        const onSubmit = vi.fn();
        render(<SearchBar value="" onSubmit={onSubmit} />);

        await userEvent.type(screen.getByRole("searchbox"), "bulb");
        await userEvent.click(screen.getByRole("button", { name: "Search" }));

        expect(onSubmit).toHaveBeenCalledExactlyOnceWith("bulb");
    });

    it("clears the field and the active search", async () => {
        const onSubmit = vi.fn();
        render(<SearchBar value="pika" onSubmit={onSubmit} />);

        await userEvent.click(
            screen.getByRole("button", { name: "Clear search" }),
        );

        expect(screen.getByRole("searchbox")).toHaveValue("");
        expect(onSubmit).toHaveBeenCalledExactlyOnceWith("");
    });

    it("follows the value when it changes from outside", () => {
        const { rerender } = render(
            <SearchBar value="pika" onSubmit={vi.fn()} />,
        );

        rerender(<SearchBar value="bulb" onSubmit={vi.fn()} />);

        expect(screen.getByRole("searchbox")).toHaveValue("bulb");
    });
});
