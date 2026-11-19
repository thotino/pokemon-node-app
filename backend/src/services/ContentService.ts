import { createWriteStream } from "node:fs";
import ContentRepository from "../repositories/ContentRepository";
import PokeRepository from "../repositories/PokeRepository";
import PokeService from "./PokeService";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import config from "../config";
const INDEX_NAME = "latest_pokenode";
export default class ContentService {
    static async buildPokemonFile(pokemonId: string) {
        const pokemon = await PokeService.getById(pokemonId);
        return await ContentRepository.buildFile(pokemon);
    }
    static async buildPokemonExport(jobId: string) {
        const exportPath = path.join(config.settings.workingDir, jobId);
        await mkdir(exportPath, { recursive: true });
        for await (const pokemon of PokeRepository.getAllByScrolling(
            INDEX_NAME,
        )) {
            const { fileName, fileStream } =
                await ContentRepository.buildFile(pokemon);
            const pokemonFilePath = path.join(exportPath, fileName);
            const pokemonFile = createWriteStream(pokemonFilePath);
            await pipeline(fileStream, pokemonFile);
        }
    }
}
