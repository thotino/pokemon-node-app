import Ajv, {
    type AnySchema,
    type ErrorObject,
    type ValidateFunction,
} from "ajv";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import InvalidRequestError from "../../errors/http/InvalidRequestError";
import type {
    RequestLocation,
    RequestSchemas,
    ValidationIssue,
} from "../../types/validation";

const ajv = new Ajv({
    allErrors: true,
    coerceTypes: "array",
    useDefaults: true,
});

export function validateRequest<P = unknown, Q = unknown, B = unknown>(
    schemas: RequestSchemas<P, Q, B>,
): RequestHandler {
    const validators = compile(schemas);
    return (req: Request, res: Response, next: NextFunction) => {
        const validated: Record<RequestLocation, unknown> = {
            params: req.params,
            query: req.query,
            body: req.body,
        };
        const issues: ValidationIssue[] = [];
        for (const [location, validator] of validators) {
            const data = structuredClone(validated[location]);
            if (validator(data)) {
                validated[location] = data;
            } else {
                issues.push(
                    ...(validator.errors ?? []).map(error =>
                        toIssue(location, error),
                    ),
                );
            }
        }
        if (issues.length !== 0) {
            return next(new InvalidRequestError(issues));
        }
        res.locals.validated = validated;
        return next();
    };
}

function compile<P, Q, B>(
    schemas: RequestSchemas<P, Q, B>,
): [RequestLocation, ValidateFunction][] {
    const entries: [RequestLocation, AnySchema | undefined][] = [
        ["params", schemas.params],
        ["query", schemas.query],
        ["body", schemas.body],
    ];
    return entries.flatMap(([location, schema]) =>
        schema == null ? [] : [[location, ajv.compile(schema)]],
    );
}

function toIssue(
    location: RequestLocation,
    error: ErrorObject,
): ValidationIssue {
    return {
        location,
        path: toPath(error),
        keyword: error.keyword,
        message: error.message ?? error.keyword,
    };
}

function toPath({ keyword, instancePath, params }: ErrorObject): string {
    const property =
        keyword === "required"
            ? params.missingProperty
            : keyword === "additionalProperties"
              ? params.additionalProperty
              : undefined;
    return typeof property === "string"
        ? `${instancePath}/${escapePointer(property)}`
        : instancePath;
}

function escapePointer(property: string): string {
    return property.replace(/~/g, "~0").replace(/\//g, "~1");
}
