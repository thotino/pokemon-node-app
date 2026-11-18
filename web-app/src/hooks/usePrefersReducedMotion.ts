import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getMediaQueryList(): MediaQueryList | null {
    return typeof window.matchMedia === "function"
        ? window.matchMedia(QUERY)
        : null;
}

function subscribe(onChange: () => void): () => void {
    const mediaQueryList = getMediaQueryList();
    mediaQueryList?.addEventListener("change", onChange);
    return () => mediaQueryList?.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
    return getMediaQueryList()?.matches ?? false;
}

export function usePrefersReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot);
}
