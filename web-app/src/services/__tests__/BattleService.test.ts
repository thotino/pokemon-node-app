import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { BattleNarration } from "../../entities/BattleNarration";
import { Pokemon } from "../../entities/Pokemon";
import { bulbasaur, charmander } from "../../test/fixtures";
import { textStream } from "../../test/streams";
import { BattleService } from "../BattleService";

const fighters = [new Pokemon(bulbasaur), new Pokemon(charmander)];
let lastBody: unknown;

const server = setupServer(
    http.post("*/api/battles", async ({ request }) => {
        lastBody = await request.json();
        return new HttpResponse(
            textStream(["Bulbizarre attaque.\n", "VAINQUEUR: Bulbizarre"]),
            { headers: { "Content-Type": "text/plain; charset=utf-8" } },
        );
    }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("BattleService.run", () => {
    it("sends the fighter ids and yields the accumulated narration", async () => {
        const narrations: BattleNarration[] = [];
        for await (const narration of BattleService.run(
            fighters,
            new AbortController().signal,
        )) {
            narrations.push(narration);
        }

        expect(lastBody).toEqual({ pokemonIds: ["1", "4"] });
        expect(narrations[0].text).toBe("Bulbizarre attaque.");
        expect(narrations.slice(0, -1).every(n => !n.isComplete)).toBe(true);
        const last = narrations[narrations.length - 1];
        expect(last.isComplete).toBe(true);
        expect(last.text).toBe("Bulbizarre attaque.");
        expect(last.winnerName).toBe("Bulbizarre");
    });
});

describe("BattleService.findWinner", () => {
    it.each([
        ["Salamèche", 4],
        ["salameche", 4],
        ["BULBIZARRE", 1],
        ["Salamèche le courageux", 4],
    ])("matches %s to the fighter #%i", (name, id) => {
        const narration = new BattleNarration(`VAINQUEUR: ${name}`, true);

        expect(BattleService.findWinner(narration, fighters)?.id).toBe(id);
    });

    it("returns undefined for an unknown name or no marker", () => {
        expect(
            BattleService.findWinner(
                new BattleNarration("VAINQUEUR: Mewtwo", true),
                fighters,
            ),
        ).toBeUndefined();
        expect(
            BattleService.findWinner(
                new BattleNarration("Nul.", true),
                fighters,
            ),
        ).toBeUndefined();
    });
});
