import json2md from "json2md";
import { Readable } from "node:stream";
import { IPokemon } from "../types/pokemon";

function pick<T extends object, K extends keyof T>(
    object: T,
    keys: readonly K[],
) {
    const picked: Partial<Pick<T, K>> = {};
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
            picked[key] = object[key];
        }
    }
    return picked;
}
export default class ContentRepository {
    static async buildFile(pokemon: IPokemon) {
        const fileName = `contents-pokemon-${pokemon.id}.md`;
        const presentation = pick(pokemon, [
            "id",
            "name",
            "image",
            "sprite",
            "slug",
        ]);
        const characteristics = pick(pokemon, [
            "apiTypes",
            "apiGeneration",
            "resistanceModifyingAbilitiesForApi",
            "apiEvolutions",
            "apiPreEvolution",
            "apiResistancesWithAbilities",
        ]);
        const content = json2md([
            { h1: `${pokemon.name} (Pokemon #${pokemon.id})` },
            { h2: `Presentation` },
            {
                ul: Object.entries(presentation).map(
                    ([key, value]) => `**${key}**: ${JSON.stringify(value)}`,
                ),
            },
            { h2: "Stats" },
            {
                ul: Object.entries(pokemon.stats).map(
                    ([key, value]) => `**${key}**: ${JSON.stringify(value)}`,
                ),
            },
            { h2: `Characteristics` },
            {
                ul: Object.entries(characteristics).map(
                    ([key, value]) => `**${key}**: ${JSON.stringify(value)}`,
                ),
            },
        ]);
        return { fileName, fileStream: Readable.from([content]) };
    }
}
