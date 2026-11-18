import {
    browserHistoryConnector,
    type UpdateSearchParamOptions,
} from "../connectors/BrowserHistoryConnector";

export class PageParamService {
    static readonly PARAM_NAME = "page";

    static parse(value: string | null): number {
        const page = Number(value);
        return Number.isInteger(page) && page >= 1 ? page : 1;
    }

    static subscribe(listener: () => void): () => void {
        return browserHistoryConnector.subscribe(listener);
    }

    static getPage(): number {
        return PageParamService.parse(
            browserHistoryConnector.getSearchParam(PageParamService.PARAM_NAME),
        );
    }

    static setPage(page: number, options: UpdateSearchParamOptions = {}): void {
        const nextPage = PageParamService.parse(String(page));
        browserHistoryConnector.setSearchParam(
            PageParamService.PARAM_NAME,
            nextPage === 1 ? null : String(nextPage),
            options,
        );
    }
}
