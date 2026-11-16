import { describe, expect, it } from "vitest";
import { logger } from "../logger.js";

describe("logger", () => {
    it("defines the supported log levels", () => {
        expect(Object.keys(logger.levels)).toEqual([
            "error",
            "warn",
            "info",
            "debug",
        ]);
    });
});
