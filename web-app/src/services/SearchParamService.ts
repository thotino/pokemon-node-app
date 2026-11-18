import { browserHistoryConnector } from "../connectors/BrowserHistoryConnector";
import type { PokemonSearchCriteria } from "../types/pokemon";
import { PageParamService } from "./PageParamService";

export class SearchParamService {
    static readonly PARAM_Q = "q";
    static readonly PARAM_TYPES = "types";
    static readonly EMPTY: PokemonSearchCriteria = Object.freeze({
        q: "",
        types: [],
    });

    static normalize({
        q,
        types,
    }: PokemonSearchCriteria): PokemonSearchCriteria {
        const cleanTypes = types
            .map(type => type.trim())
            .filter(type => type !== "");
        return {
            q: q.trim(),
            types: [...new Set(cleanTypes)].sort(),
        };
    }

    static parse(search: string): PokemonSearchCriteria {
        const params = new URLSearchParams(search);
        return SearchParamService.normalize({
            q: params.get(SearchParamService.PARAM_Q) ?? "",
            types: params.getAll(SearchParamService.PARAM_TYPES),
        });
    }

    static isActive({ q, types }: PokemonSearchCriteria): boolean {
        return q !== "" || types.length !== 0;
    }

    static toggleType(
        criteria: PokemonSearchCriteria,
        type: string,
    ): PokemonSearchCriteria {
        const types = criteria.types.includes(type)
            ? criteria.types.filter(item => item !== type)
            : [...criteria.types, type];
        return SearchParamService.normalize({ ...criteria, types });
    }

    static subscribe(listener: () => void): () => void {
        return browserHistoryConnector.subscribe(listener);
    }

    static getSearch(): string {
        return browserHistoryConnector.getSearch();
    }

    static getCriteria(): PokemonSearchCriteria {
        return SearchParamService.parse(SearchParamService.getSearch());
    }

    static setCriteria(criteria: PokemonSearchCriteria): void {
        const { q, types } = SearchParamService.normalize(criteria);
        browserHistoryConnector.setSearchParams({
            [SearchParamService.PARAM_Q]: q === "" ? null : q,
            [SearchParamService.PARAM_TYPES]: types.length === 0 ? null : types,
            [PageParamService.PARAM_NAME]: null,
        });
    }
}
