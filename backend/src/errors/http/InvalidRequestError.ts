import type { ServiceErrorInterface } from "../../types/error";
import type { ValidationIssue } from "../../types/validation";

export default class InvalidRequestError
    extends Error
    implements ServiceErrorInterface
{
    readonly code = "ERR_INVALID_REQUEST";
    readonly value = null;
    readonly issues: ValidationIssue[];
    constructor(issues: ValidationIssue[]) {
        super("Request validation failed");
        this.name = "InvalidRequestError";
        this.issues = issues;
    }
}
