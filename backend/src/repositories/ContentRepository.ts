import json2md from "json2md";
import Pokemon from "../entities/Pokemon";
import { Readable } from "node:stream";
import { IPokemon } from "../types/pokemon";

export default class ContentRepository {
  static async buildFile(pokemon: IPokemon) {
    const fileName = `contents-pokemon-${pokemon.id}.md`;
    const entries = Object.entries(pokemon);
    const content = json2md([
      {
        table: {
          headers: entries.map(([key]) => key),
          rows: [
            entries.map(([, value]) =>
              typeof value === "object" && value !== null
                ? JSON.stringify(value)
                : value,
            ),
          ],
        },
      },
    ]);
    return { fileName, fileStream: Readable.from([content]) };
  }
}
