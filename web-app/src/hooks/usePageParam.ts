import { useSyncExternalStore } from "react";
import { PageParamService } from "../services/PageParamService";

export function usePageParam() {
    const page = useSyncExternalStore(
        PageParamService.subscribe,
        PageParamService.getPage,
    );
    return [page, PageParamService.setPage] as const;
}
