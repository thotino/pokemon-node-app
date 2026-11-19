import { BattleNarration } from "../entities/BattleNarration";
import type { Pokemon } from "../entities/Pokemon";
import { BattleApiRepository } from "../repositories/BattleApiRepository";

export class BattleService {
    static async *run(
        fighters: readonly Pokemon[],
        signal: AbortSignal,
    ): AsyncGenerator<BattleNarration> {
        const { chunks } = await BattleApiRepository.start(
            fighters.map(fighter => String(fighter.id)),
            signal,
        );
        let raw = "";
        for await (const chunk of chunks) {
            raw += chunk;
            yield new BattleNarration(raw);
        }
        yield new BattleNarration(raw, true);
    }

    static findWinner(
        narration: BattleNarration,
        fighters: readonly Pokemon[],
    ): Pokemon | undefined {
        if (narration.winnerName == null) {
            return undefined;
        }
        const winner = BattleService.#normalize(narration.winnerName);
        return (
            fighters.find(
                fighter => BattleService.#normalize(fighter.name) === winner,
            ) ??
            fighters.find(fighter =>
                winner.includes(BattleService.#normalize(fighter.name)),
            )
        );
    }

    static #normalize(name: string): string {
        return name
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase()
            .trim();
    }
}
