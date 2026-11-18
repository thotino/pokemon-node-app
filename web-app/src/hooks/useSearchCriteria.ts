import { useMemo, useSyncExternalStore } from "react";
import { SearchParamService } from "../services/SearchParamService";

export function useSearchCriteria() {
    const search = useSyncExternalStore(
        SearchParamService.subscribe,
        SearchParamService.getSearch,
    );
    const criteria = useMemo(() => SearchParamService.parse(search), [search]);
    return [criteria, SearchParamService.setCriteria] as const;
}
