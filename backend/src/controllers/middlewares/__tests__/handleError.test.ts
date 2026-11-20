import { describe, expect, it, vi } from "vitest";
import express, { type Request, type Response } from "express";
import createError from "http-errors";
import request from "supertest";
import { handleError, toWebserverError } from "../handleError";
import ChatbotRateLimitError from "../../../errors/ChatbotRateLimitError";
import ChatbotUnavailableError from "../../../errors/ChatbotUnavailableError";
import PokemonNotFoundError from "../../../errors/PokemonNotFoundError";
import InternalServerError from "../../../errors/http/InternalServerError";
import InvalidRequestError from "../../../errors/http/InvalidRequestError";
import type { ValidationIssue } from "../../../types/validation";

const issue: ValidationIssue = {
    location: "body",
    path: "/pokemonIds",
    keyword: "minItems",
    message: "must NOT have fewer than 2 items",
};

function appThrowing(error: unknown) {
    const app = express();
    app.get("/", () => {
        throw error;
    });
    app.use(handleError);
    return app;
}

describe("toWebserverError", () => {
    it.each([
        [new InvalidRequestError([issue]), 400],
        [new PokemonNotFoundError(["9999"]), 404],
        [new ChatbotRateLimitError(12), 429],
        [new ChatbotUnavailableError(), 502],
    ])("maps %s to %i and keeps it as cause", (error, statusCode) => {
        const webserverError = toWebserverError(error);

        expect(webserverError.statusCode).toBe(statusCode);
        expect(webserverError.status).toBe(statusCode);
        expect(webserverError.code).toBe(error.code);
        expect(webserverError.message).toBe(error.message);
        expect(webserverError.cause).toBe(error);
        expect(createError.isHttpError(webserverError)).toBe(true);
    });

    it("exposes client errors only", () => {
        expect(
            toWebserverError(new PokemonNotFoundError(["9999"])).expose,
        ).toBe(true);
        expect(toWebserverError(new Error("boom")).expose).toBe(false);
    });

    it("puts retry-after in the headers", () => {
        expect(toWebserverError(new ChatbotRateLimitError(12)).headers).toEqual(
            { "Retry-After": "12" },
        );
    });

    it("turns an express client error into an InvalidRequestError", () => {
        const webserverError = toWebserverError(
            createError(413, "request entity too large", {
                type: "entity.too.large",
            }),
        );

        expect(webserverError.statusCode).toBe(413);
        expect(webserverError.code).toBe("ERR_INVALID_REQUEST");
        expect(webserverError.cause).toBeInstanceOf(InvalidRequestError);
        expect(webserverError.validationErrors).toEqual([
            {
                location: "body",
                path: "",
                keyword: "entity.too.large",
                message: "request entity too large",
            },
        ]);
    });

    it("keeps express server errors internal", () => {
        const webserverError = toWebserverError(createError(503));

        expect(webserverError.statusCode).toBe(500);
        expect(webserverError.cause).toBeInstanceOf(InternalServerError);
    });

    it("wraps unknown errors in an InternalServerError", () => {
        const failure = new Error("boom");

        const webserverError = toWebserverError(failure);

        expect(webserverError.statusCode).toBe(500);
        expect(webserverError.code).toBe("ERR_INTERNAL");
        expect(webserverError.cause).toBeInstanceOf(InternalServerError);
        expect((webserverError.cause as InternalServerError).cause).toBe(
            failure,
        );
    });
});

describe("handleError", () => {
    it("answers 400 on malformed JSON", async () => {
        const app = express();
        app.use(express.json());
        app.post("/", (_req, res) => res.sendStatus(204));
        app.use(handleError);

        const response = await request(app)
            .post("/")
            .set("Content-Type", "application/json")
            .send('{"pokemonIds": [25,');

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
            code: "ERR_INVALID_REQUEST",
            value: null,
            validationErrors: [
                {
                    location: "body",
                    path: "",
                    keyword: "entity.parse.failed",
                },
            ],
        });
    });

    it("answers 400 with the validation errors", async () => {
        const response = await request(
            appThrowing(new InvalidRequestError([issue])),
        ).get("/");

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            code: "ERR_INVALID_REQUEST",
            message: "Request validation failed",
            value: null,
            validationErrors: [issue],
        });
    });

    it("answers 404 with the unknown pokemon ids", async () => {
        const response = await request(
            appThrowing(new PokemonNotFoundError(["9999"])),
        ).get("/");

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            code: "ERR_POKEMON_NOT_FOUND",
            message: "Pokemon not found: 9999",
            value: ["9999"],
        });
    });

    it("answers 429 and relays retry-after", async () => {
        const response = await request(
            appThrowing(new ChatbotRateLimitError(12)),
        ).get("/");

        expect(response.status).toBe(429);
        expect(response.headers["retry-after"]).toBe("12");
        expect(response.body).toMatchObject({
            code: "ERR_CHATBOT_RATE_LIMITED",
            value: 12,
        });
    });

    it("omits retry-after when the chatbot gives no delay", async () => {
        const response = await request(
            appThrowing(new ChatbotRateLimitError()),
        ).get("/");

        expect(response.status).toBe(429);
        expect(response.headers).not.toHaveProperty("retry-after");
    });

    it("answers 502 when the chatbot is unavailable", async () => {
        const response = await request(
            appThrowing(new ChatbotUnavailableError()),
        ).get("/");

        expect(response.status).toBe(502);
        expect(response.body).toMatchObject({
            code: "ERR_CHATBOT_UNAVAILABLE",
        });
    });

    it("answers 500 on unknown errors, whatever their status code", async () => {
        const failure = Object.assign(new Error("illegal_argument"), {
            statusCode: 400,
        });

        const response = await request(appThrowing(failure)).get("/");

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            code: "ERR_INTERNAL",
            message: "Internal server error",
            value: null,
        });
    });

    it("hands over to express once the response has started", () => {
        const error = new ChatbotUnavailableError();
        const res = { headersSent: true, status: vi.fn() };
        const next = vi.fn();

        handleError(error, {} as Request, res as unknown as Response, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
    });
});
