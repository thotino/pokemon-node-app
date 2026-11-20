import type { NextFunction, Request, Response } from "express";
import createError, { type HttpError } from "http-errors";
import ChatbotRateLimitError from "../../errors/ChatbotRateLimitError";
import ChatbotUnavailableError from "../../errors/ChatbotUnavailableError";
import PokemonNotFoundError from "../../errors/PokemonNotFoundError";
import InternalServerError from "../../errors/http/InternalServerError";
import InvalidRequestError from "../../errors/http/InvalidRequestError";
import type {
    ServiceErrorInterface,
    WebserverErrorInterface,
} from "../../types/error";

export function handleError(
    error: unknown,
    _req: Request,
    res: Response,
    next: NextFunction,
) {
    if (res.headersSent) {
        return next(error);
    }
    const webserverError = toWebserverError(error);
    if (webserverError.cause instanceof InternalServerError) {
        console.error("Request failed:", error);
    }
    return res
        .status(webserverError.statusCode)
        .set(webserverError.headers ?? {})
        .send({
            code: webserverError.code,
            message: webserverError.message,
            value: webserverError.value,
            validationErrors: webserverError.validationErrors,
        });
}

export function toWebserverError(error: unknown): WebserverErrorInterface {
    if (error instanceof InvalidRequestError) {
        return Object.assign(fromCause(400, error), {
            validationErrors: error.issues,
        });
    }
    if (error instanceof PokemonNotFoundError) {
        return fromCause(404, error);
    }
    if (error instanceof ChatbotRateLimitError) {
        return error.retryAfterSeconds == null
            ? fromCause(429, error)
            : Object.assign(fromCause(429, error), {
                  headers: { "Retry-After": error.retryAfterSeconds },
              });
    }
    if (error instanceof ChatbotUnavailableError) {
        return fromCause(502, error);
    }
    if (isClientHttpError(error)) {
        const cause = new InvalidRequestError([
            {
                location: "body",
                path: "",
                keyword: error.type ?? "http",
                message: error.message,
            },
        ]);
        return Object.assign(fromCause(error.status, cause), {
            validationErrors: cause.issues,
            headers: error.headers,
        });
    }
    return fromCause(500, new InternalServerError(error));
}

function fromCause(
    statusCode: number,
    cause: ServiceErrorInterface,
): WebserverErrorInterface {
    return Object.assign(createError(statusCode, cause.message), {
        code: cause.code,
        value: cause.value ?? null,
        cause,
    });
}

function isClientHttpError(error: unknown): error is HttpError {
    return createError.isHttpError(error) && error.expose;
}
