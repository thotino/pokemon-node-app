import { afterEach, describe, expect, it } from "vitest";
import { ViewParamService } from "../ViewParamService";

afterEach(() => window.history.replaceState(null, "", "/"));

describe("ViewParamService", () => {
    it.each([
        [null, "grid"],
        ["battle", "battle"],
        ["other", "grid"],
    ])("parses %s as %s", (value, expected) => {
        expect(ViewParamService.parse(value)).toBe(expected);
    });

    it("writes the battle view in the URL and keeps the other params", () => {
        window.history.replaceState(null, "", "/?page=3");

        ViewParamService.setView("battle");

        expect(window.location.search).toBe("?page=3&view=battle");
        expect(ViewParamService.getView()).toBe("battle");

        ViewParamService.setView("grid");

        expect(window.location.search).toBe("?page=3");
        expect(ViewParamService.getView()).toBe("grid");
    });
});
