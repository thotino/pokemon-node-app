import type { estypes } from "@elastic/elasticsearch";

export interface IndexWithAliases {
    name: string;
    aliases: string[];
}

export type AliasAction = estypes.IndicesUpdateAliasesAction;

export interface RotationPlan {
    actions: AliasAction[];
    previous: string | null;
    toDelete: string[];
}
