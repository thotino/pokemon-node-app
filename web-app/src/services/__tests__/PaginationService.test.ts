import { describe, expect, it } from "vitest";
import { PaginationService } from "../PaginationService";

describe("PaginationService.items", () => {
    it("returns nothing without pages", () => {
        expect(PaginationService.items(1, 0)).toEqual([]);
    });

    it("lists every page when they all fit", () => {
        expect(PaginationService.items(1, 1)).toEqual([1]);
        expect(PaginationService.items(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it.each([
        [1, [1, 2, 3, 4, 5, "ellipsis-end", 10]],
        [4, [1, 2, 3, 4, 5, "ellipsis-end", 10]],
        [5, [1, "ellipsis-start", 4, 5, 6, "ellipsis-end", 10]],
        [7, [1, "ellipsis-start", 6, 7, 8, 9, 10]],
        [10, [1, "ellipsis-start", 6, 7, 8, 9, 10]],
    ])("page %i of 10 -> %j", (page, expected) => {
        expect(PaginationService.items(page, 10)).toEqual(expected);
    });

    it("keeps the same number of items whatever the current page", () => {
        const lengths = PaginationService.rangeOf(1, 66).map(
            page => PaginationService.items(page, 66).length,
        );
        expect(new Set(lengths)).toEqual(new Set([7]));
    });

    it("supports more siblings", () => {
        expect(PaginationService.items(33, 66, 2)).toEqual([
            1,
            "ellipsis-start",
            31,
            32,
            33,
            34,
            35,
            "ellipsis-end",
            66,
        ]);
    });

    it("clamps an out-of-range page", () => {
        expect(PaginationService.items(99, 10)).toEqual(
            PaginationService.items(10, 10),
        );
        expect(PaginationService.items(-3, 10)).toEqual(
            PaginationService.items(1, 10),
        );
    });
});

describe("PaginationService.clamp", () => {
    it.each([
        [0, 5, 1],
        [3, 5, 3],
        [9, 5, 5],
        [Number.NaN, 5, 1],
        [2.7, 5, 2],
        [4, 0, 1],
    ])("clamp(%s, %i) -> %i", (page, total, expected) => {
        expect(PaginationService.clamp(page, total)).toBe(expected);
    });
});
