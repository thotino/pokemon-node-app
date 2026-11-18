import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserHistoryConnector } from "../BrowserHistoryConnector";

describe("BrowserHistoryConnector", () => {
    afterEach(() => {
        window.history.replaceState(null, "", "/");
    });

    it("reads a search param", () => {
        window.history.replaceState(null, "", "/?page=4&q=pika");
        const connector = new BrowserHistoryConnector();

        expect(connector.getSearchParam("page")).toBe("4");
        expect(connector.getSearchParam("missing")).toBeNull();
    });

    it("pushes a new history entry and notifies subscribers", () => {
        const connector = new BrowserHistoryConnector();
        const listener = vi.fn();
        const unsubscribe = connector.subscribe(listener);
        const historyLength = window.history.length;

        connector.setSearchParam("page", "3");

        expect(window.location.search).toBe("?page=3");
        expect(window.history.length).toBe(historyLength + 1);
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
    });

    it("replaces the entry and keeps other params", () => {
        window.history.replaceState(null, "", "/?q=pika&page=5");
        const connector = new BrowserHistoryConnector();
        const historyLength = window.history.length;

        connector.setSearchParam("page", null, { replace: true });

        expect(window.location.search).toBe("?q=pika");
        expect(window.history.length).toBe(historyLength);
    });

    it("does nothing when the URL does not change", () => {
        window.history.replaceState(null, "", "/?page=2");
        const connector = new BrowserHistoryConnector();
        const listener = vi.fn();
        connector.subscribe(listener);

        connector.setSearchParam("page", "2");

        expect(listener).not.toHaveBeenCalled();
    });

    it("reads repeated search params and the raw search string", () => {
        window.history.replaceState(null, "", "/?types=Feu&types=Vol");
        const connector = new BrowserHistoryConnector();

        expect(connector.getSearchParams("types")).toEqual(["Feu", "Vol"]);
        expect(connector.getSearchParams("missing")).toEqual([]);
        expect(connector.getSearch()).toBe("?types=Feu&types=Vol");
    });

    it("updates several params in a single history entry and notification", () => {
        window.history.replaceState(null, "", "/?page=4&types=Eau&keep=1");
        const connector = new BrowserHistoryConnector();
        const listener = vi.fn();
        const unsubscribe = connector.subscribe(listener);
        const historyLength = window.history.length;

        connector.setSearchParams({
            q: "pika",
            types: ["Feu", "Vol"],
            page: null,
        });

        const params = new URLSearchParams(window.location.search);
        expect(params.get("q")).toBe("pika");
        expect(params.getAll("types")).toEqual(["Feu", "Vol"]);
        expect(params.has("page")).toBe(false);
        expect(params.get("keep")).toBe("1");
        expect(window.history.length).toBe(historyLength + 1);
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
    });

    it("removes a repeated param when given an empty list", () => {
        window.history.replaceState(null, "", "/?types=Feu&types=Vol");
        const connector = new BrowserHistoryConnector();

        connector.setSearchParams({ types: [] });

        expect(window.location.search).toBe("");
    });

    it("notifies subscribers on browser navigation until unsubscribed", () => {
        const connector = new BrowserHistoryConnector();
        const listener = vi.fn();
        const unsubscribe = connector.subscribe(listener);

        window.dispatchEvent(new PopStateEvent("popstate"));
        unsubscribe();
        window.dispatchEvent(new PopStateEvent("popstate"));

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("drops every subscriber on close", async () => {
        const connector = new BrowserHistoryConnector();
        const listener = vi.fn();
        connector.subscribe(listener);

        await connector.close();
        window.dispatchEvent(new PopStateEvent("popstate"));

        expect(listener).not.toHaveBeenCalled();
    });
});
