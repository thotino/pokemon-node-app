import { afterEach, describe, expect, it } from "vitest";
import { SearchParamService } from "../SearchParamService";

describe("SearchParamService", () => {
    afterEach(() => {
        window.history.replaceState(null, "", "/");
    });

    it("normalizes the query and the types", () => {
        expect(
            SearchParamService.normalize({
                q: "  pika ",
                types: ["Vol", " Feu", "", "Vol"],
            }),
        ).toEqual({ q: "pika", types: ["Feu", "Vol"] });
    });

    it("parses the criteria from a search string", () => {
        expect(
            SearchParamService.parse("?q=bulb&types=Vol&types=Feu&page=2"),
        ).toEqual({ q: "bulb", types: ["Feu", "Vol"] });
        expect(SearchParamService.parse("")).toEqual(SearchParamService.EMPTY);
    });

    it("tells whether a criterion is active", () => {
        expect(SearchParamService.isActive(SearchParamService.EMPTY)).toBe(
            false,
        );
        expect(SearchParamService.isActive({ q: "a", types: [] })).toBe(true);
        expect(SearchParamService.isActive({ q: "", types: ["Feu"] })).toBe(
            true,
        );
    });

    it("toggles a type on and off", () => {
        const withFire = SearchParamService.toggleType(
            { q: "", types: ["Vol"] },
            "Feu",
        );
        expect(withFire.types).toEqual(["Feu", "Vol"]);
        expect(SearchParamService.toggleType(withFire, "Vol").types).toEqual([
            "Feu",
        ]);
    });

    it("writes the criteria to the URL and goes back to the first page", () => {
        window.history.replaceState(null, "", "/?page=3");

        SearchParamService.setCriteria({ q: " pika ", types: ["Vol", "Feu"] });

        expect(window.location.search).toBe("?q=pika&types=Feu&types=Vol");
        expect(SearchParamService.getCriteria()).toEqual({
            q: "pika",
            types: ["Feu", "Vol"],
        });
    });

    it("removes empty criteria from the URL", () => {
        window.history.replaceState(null, "", "/?q=pika&types=Feu&page=2");

        SearchParamService.setCriteria(SearchParamService.EMPTY);

        expect(window.location.search).toBe("");
    });
});
