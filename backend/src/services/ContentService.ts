import { createWriteStream } from "node:fs";
import ContentRepository from "../repositories/ContentRepository";
import PokeRepository from "../repositories/PokeRepository";
import PokeService from "./PokeService";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

export default class ContentService {
    static async buildPokemonFile(pokemonId: string) {
        const pokemon = await PokeService.getById(pokemonId);
        return await ContentRepository.buildFile(pokemon);
    }
    static async buildPokemonExport() {
        const workingDir = path.join(__dirname, "/export-ru");
        const indexName = "latest_pokenode";
        await mkdir(workingDir, { recursive: true });
        for await (const pokemon of PokeRepository.getAllByScrolling(
            indexName,
        )) {
            const { fileName, fileStream } =
                await ContentRepository.buildFile(pokemon);
            const pokemonFilePath = path.join(workingDir, fileName);
            const pokemonFile = createWriteStream(pokemonFilePath);
            await pipeline(fileStream, pokemonFile);
        }
    }
}
