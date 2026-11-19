import {
    browserHistoryConnector,
    type UpdateSearchParamOptions,
} from "../connectors/BrowserHistoryConnector";
import { BATTLE_VIEW } from "../constants";
import type { AppView } from "../types/battle";

export class ViewParamService {
    static readonly PARAM_NAME = "view";

    static parse(value: string | null): AppView {
        return value === BATTLE_VIEW ? "battle" : "grid";
    }

    static subscribe(listener: () => void): () => void {
        return browserHistoryConnector.subscribe(listener);
    }

    static getView(): AppView {
        return ViewParamService.parse(
            browserHistoryConnector.getSearchParam(ViewParamService.PARAM_NAME),
        );
    }

    static setView(
        view: AppView,
        options: UpdateSearchParamOptions = {},
    ): void {
        browserHistoryConnector.setSearchParam(
            ViewParamService.PARAM_NAME,
            view === "battle" ? BATTLE_VIEW : null,
            options,
        );
    }
}
