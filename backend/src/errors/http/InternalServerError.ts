import type { ServiceErrorInterface } from "../../types/error";

export default class InternalServerError
    extends Error
    implements ServiceErrorInterface
{
    readonly code = "ERR_INTERNAL";
    readonly value = null;
    readonly cause?: unknown;
    constructor(cause?: unknown) {
        super("Internal server error");
        this.name = "InternalServerError";
        this.cause = cause;
    }
}
