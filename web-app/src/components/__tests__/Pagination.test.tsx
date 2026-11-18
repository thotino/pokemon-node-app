import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "../Pagination";

function renderPagination(page: number, totalPages: number) {
    const onPageChange = vi.fn();
    render(
        <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
        />,
    );
    return onPageChange;
}

describe("Pagination", () => {
    it("renders nothing for a single page", () => {
        renderPagination(1, 1);

        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("marks the current page", () => {
        renderPagination(5, 10);

        expect(
            screen.getByRole("navigation", { name: "Pagination" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Page 5" })).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(
            screen.getByRole("button", { name: "Page 4" }),
        ).not.toHaveAttribute("aria-current");
        expect(screen.getByText("Page 5 / 10")).toBeInTheDocument();
    });

    it("shows the page window with ellipses", () => {
        renderPagination(5, 10);

        const labels = screen
            .getAllByRole("button", { name: /^Page \d+$/ })
            .map(button => button.textContent);
        expect(labels).toEqual(["1", "4", "5", "6", "10"]);
        expect(screen.getAllByText("…")).toHaveLength(2);
    });

    it("disables previous on the first page and next on the last page", () => {
        const { rerender } = render(
            <Pagination page={1} totalPages={3} onPageChange={vi.fn()} />,
        );
        expect(
            screen.getByRole("button", { name: "Previous page" }),
        ).toBeDisabled();
        expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();

        rerender(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />);
        expect(
            screen.getByRole("button", { name: "Previous page" }),
        ).toBeEnabled();
        expect(
            screen.getByRole("button", { name: "Next page" }),
        ).toBeDisabled();
    });

    it("calls onPageChange with the target page", async () => {
        const onPageChange = renderPagination(5, 10);

        await userEvent.click(
            screen.getByRole("button", { name: "Next page" }),
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Previous page" }),
        );
        await userEvent.click(screen.getByRole("button", { name: "Page 10" }));

        expect(onPageChange.mock.calls).toEqual([[6], [4], [10]]);
    });

    it("does not call onPageChange for the current page", async () => {
        const onPageChange = renderPagination(5, 10);

        await userEvent.click(screen.getByRole("button", { name: "Page 5" }));

        expect(onPageChange).not.toHaveBeenCalled();
    });
});
