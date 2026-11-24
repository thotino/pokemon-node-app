import { logger } from "./logger";
import * as connectors from "./connectors";
import PokeIndexationService from "./services/PokemonIndexationService";
async function startConnectors() {
    await Promise.all(
        Object.values(connectors).map(connector => connector.connect()),
    );
}
async function stopConnectors() {
    await Promise.all(
        Object.values(connectors).map(connector => connector.close()),
    );
}
async function main() {
    await startConnectors();
    await PokeIndexationService.exec();
}
async function onTermination(error?: Error) {
    await stopConnectors();
    if (error != null) {
        logger.error(error);
        process.exit(1);
    }
    process.exit(0);
}
if (require.main === module) {
    main()
        .then(() => onTermination())
        .catch(onTermination);
    process.once("SIGINT", () => onTermination());
    process.once("SIGTERM", () => onTermination());
}
