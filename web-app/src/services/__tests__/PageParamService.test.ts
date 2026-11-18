import { afterEach, describe, expect, it, vi } from "vitest";
import { PageParamService } from "../PageParamService";

describe("PageParamService", () => {
    afterEach(() => {
        window.history.replaceState(null, "", "/");
    });

    it.each([
        [null, 1],
        ["3", 3],
        ["0", 1],
        ["-2", 1],
        ["1.5", 1],
        ["abc", 1],
    ])("parse(%s) -> %i", (value, expected) => {
        expect(PageParamService.parse(value)).toBe(expected);
    });

    it("reads the page from the URL", () => {
        window.history.replaceState(null, "", "/?page=4");

        expect(PageParamService.getPage()).toBe(4);
    });

    it("falls back to page 1 for an invalid URL value", () => {
        window.history.replaceState(null, "", "/?page=abc");

        expect(PageParamService.getPage()).toBe(1);
    });

    it("writes the page into the URL and notifies subscribers", () => {
        const listener = vi.fn();
        const unsubscribe = PageParamService.subscribe(listener);

        PageParamService.setPage(3);

        expect(window.location.search).toBe("?page=3");
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
    });

    it("removes the param for page 1", () => {
        window.history.replaceState(null, "", "/?q=pika&page=5");

        PageParamService.setPage(1, { replace: true });

        expect(window.location.search).toBe("?q=pika");
    });

    it("normalizes an invalid page to page 1", () => {
        window.history.replaceState(null, "", "/?page=5");

        PageParamService.setPage(Number.NaN);

        expect(window.location.search).toBe("");
    });
});
