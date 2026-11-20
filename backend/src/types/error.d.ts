import type { HttpError } from "http-errors";

export interface ServiceErrorInterface {
    code: string;
    value?: unknown | null;
    message: string;
}

export interface WebserverErrorInterface
    extends ServiceErrorInterface, HttpError {
    validationErrors?: unknown[];
    cause?: ServiceErrorInterface;
}
