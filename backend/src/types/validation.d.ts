import type { JSONSchemaType } from "ajv";

export type RequestLocation = "params" | "query" | "body";

export interface RequestSchemas<P = unknown, Q = unknown, B = unknown> {
    params?: JSONSchemaType<P>;
    query?: JSONSchemaType<Q>;
    body?: JSONSchemaType<B>;
}

export interface ValidationIssue {
    location: RequestLocation;
    path: string;
    keyword: string;
    message: string;
}

export interface ValidatedLocals<P = unknown, Q = unknown, B = unknown> {
    validated: {
        params: P;
        query: Q;
        body: B;
    };
}
