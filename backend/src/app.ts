import cors from "cors";
import express from "express";
import config from "./config";

import { createServer } from "http";
import { PokemonController } from "./controllers/PokemonController";
import { ContentController } from "./controllers/ContentsController";
import { BattleController } from "./controllers/BattleController";
import { handleError } from "./controllers/middlewares/handleError";

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
httpServer.listen(config.webserver.port, () => {
    console.debug("Server started on port:", config.webserver.port);
});
