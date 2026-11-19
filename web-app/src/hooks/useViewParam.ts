import { useSyncExternalStore } from "react";
import { ViewParamService } from "../services/ViewParamService";

export function useViewParam() {
    const view = useSyncExternalStore(
        ViewParamService.subscribe,
        ViewParamService.getView,
    );
    return [view, ViewParamService.setView] as const;
}
