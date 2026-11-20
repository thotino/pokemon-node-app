import { describe, expect, it } from "vitest";
import express, {
    type NextFunction,
    type Request,
    type Response,
} from "express";
import request from "supertest";
import { validateRequest } from "../validateRequest";
import InvalidRequestError from "../../../errors/http/InvalidRequestError";
import PokemonSchemas from "../../schemas/PokemonSchemas";
import BattleSchemas from "../../schemas/BattleSchemas";

const echo = (req: Request, res: Response) =>
    res.status(200).send({ validated: res.locals.validated, raw: req.body });

const app = express();
app.set("query parser", "simple");
app.use(express.json());
app.get(
    "/pokemons",
    validateRequest({ query: PokemonSchemas.searchQuery }),
    echo,
);
app.get(
    "/pokemons/:id",
    validateRequest({ params: PokemonSchemas.idParams }),
    echo,
);
app.post("/battles", validateRequest({ body: BattleSchemas.body }), echo);
app.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
    if (!(error instanceof InvalidRequestError)) {
        return next(error);
    }
    res.status(400).send({
        name: error.constructor.name,
        issues: error.issues,
    });
});

describe("validateRequest", () => {
    it("applies defaults to an empty query", async () => {
        const response = await request(app).get("/pokemons");

        expect(response.status).toBe(200);
        expect(response.body.validated.query).toEqual({ from: 0, size: 20 });
    });

    it("coerces query strings to integers and arrays", async () => {
        const response = await request(app).get(
            "/pokemons?q=pika&types=fire&from=10&size=5",
        );

        expect(response.status).toBe(200);
        expect(response.body.validated.query).toEqual({
            q: "pika",
            types: ["fire"],
            from: 10,
            size: 5,
        });
    });

    it("keeps repeated query values as an array", async () => {
        const response = await request(app).get(
            "/pokemons?types=fire&types=water",
        );

        expect(response.body.validated.query.types).toEqual(["fire", "water"]);
    });

    it("reports every issue with its location and JSON pointer", async () => {
        const response = await request(app).get(
            "/pokemons?size=abc&from=-1&foo=x",
        );

        expect(response.status).toBe(400);
        expect(response.body.name).toBe("InvalidRequestError");
        expect(response.body.issues).toEqual(
            expect.arrayContaining([
                {
                    location: "query",
                    path: "/foo",
                    keyword: "additionalProperties",
                    message: "must NOT have additional properties",
                },
                {
                    location: "query",
                    path: "/from",
                    keyword: "minimum",
                    message: "must be >= 0",
                },
                {
                    location: "query",
                    path: "/size",
                    keyword: "type",
                    message: "must be integer",
                },
            ]),
        );
        expect(response.body.issues).toHaveLength(3);
    });

    it("validates route params", async () => {
        const response = await request(app).get("/pokemons/pikachu");

        expect(response.status).toBe(400);
        expect(response.body.issues).toEqual([
            expect.objectContaining({
                location: "params",
                path: "/id",
                keyword: "pattern",
            }),
        ]);
    });

    it("validates the body", async () => {
        const response = await request(app)
            .post("/battles")
            .send({ pokemonIds: ["25"] });

        expect(response.status).toBe(400);
        expect(response.body.name).toBe("InvalidRequestError");
        expect(response.body.issues).toEqual([
            expect.objectContaining({
                location: "body",
                path: "/pokemonIds",
                keyword: "minItems",
            }),
        ]);
    });

    it("points to the missing property", async () => {
        const response = await request(app).post("/battles").send({});

        expect(response.body.issues).toEqual([
            expect.objectContaining({
                path: "/pokemonIds",
                keyword: "required",
            }),
        ]);
    });

    it("rejects a request without body", async () => {
        const response = await request(app).post("/battles");

        expect(response.status).toBe(400);
        expect(response.body.issues).toEqual([
            expect.objectContaining({
                location: "body",
                path: "",
                keyword: "type",
            }),
        ]);
    });

    it("stores coerced values without mutating the request", async () => {
        const response = await request(app)
            .post("/battles")
            .send({ pokemonIds: ["25", 6] });

        expect(response.status).toBe(200);
        expect(response.body.validated.body).toEqual({
            pokemonIds: ["25", "6"],
        });
        expect(response.body.raw).toEqual({ pokemonIds: ["25", 6] });
    });

    it.each([
        ["a float", 6.5],
        ["a boolean", true],
        ["zero", 0],
        ["a duplicate", 25],
    ])("rejects %s among the battle ids", async (_label, id) => {
        const response = await request(app)
            .post("/battles")
            .send({ pokemonIds: ["25", id] });

        expect(response.status).toBe(400);
    });
});
