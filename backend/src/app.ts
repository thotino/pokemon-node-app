import cors from "cors";
import express from "express";
import config from "./config";

import { createServer } from "http";
import { PokemonController } from "./controllers/PokemonController";
import { ContentController } from "./controllers/ContentsController";
import { BattleController } from "./controllers/BattleController";
import { handleError } from "./controllers/middlewares/handleError";
import { shutdown, start } from "./manager";

/** App */
const app = express();

app.disable("x-powered-by");
const httpServer = createServer(app);

app.set("trust proxy", 1);
app.use(
    cors({
        origin: true,
        credentials: true,
        exposedHeaders: ["set-cookie", "X-Session-Id", "Retry-After"],
    }),
);
app.set("query parser", "simple");

/**
 * Body parser
 */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * Routes
 */
app.use("/pokemons", PokemonController);
app.use("/contents", ContentController);
app.use("/battles", BattleController);
app.get("/ping", (_req, res) => res.status(200).send("pong"));
app.use(handleError);

/* -------------------------- Start the application ------------------------- */

/**
 * Start server
 */
async function main() {
    await start(httpServer, config.webserver.port);
    console.debug("Server started on port:", config.webserver.port);
}

/**
 * Graceful shutdown
 */
async function onTermination() {
    try {
        await shutdown(
            httpServer,
            config.service.gracefulShutdownDelayInSeconds * 1000,
        );
        console.info("Server stopped");
        process.exit(0);
    } catch (error) {
        console.error("Server failed to stop:", error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(error => {
        console.error("Server failed to start:", error);
        process.exit(1);
    });
    process.once("SIGTERM", onTermination);
    process.once("SIGINT", onTermination);
}
