import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface BattleNarrationViewProps {
    text: string;
    isStreaming: boolean;
}

const STICK_THRESHOLD_PX = 24;

export function BattleNarrationView({
    text,
    isStreaming,
}: BattleNarrationViewProps) {
    const ref = useRef<HTMLElement>(null);
    const stickToBottom = useRef(true);
    const reduceMotion = usePrefersReducedMotion();

    useEffect(() => {
        const element = ref.current;
        if (element != null && stickToBottom.current) {
            element.scrollTop = element.scrollHeight;
        }
    }, [text]);

    if (text === "" && !isStreaming) {
        return null;
    }

    return (
        <section
            ref={ref}
            aria-label="Battle narration"
            aria-busy={isStreaming}
            tabIndex={0}
            onScroll={event => {
                const element = event.currentTarget;
                stickToBottom.current =
                    element.scrollHeight -
                        element.scrollTop -
                        element.clientHeight <
                    STICK_THRESHOLD_PX;
            }}
            className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-white/70 p-4 leading-relaxed text-slate-800 shadow-inner focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 dark:bg-slate-900/80 dark:text-slate-100"
        >
            {text}
            {isStreaming && (
                <span
                    aria-hidden="true"
                    data-testid="narration-cursor"
                    className={`ml-0.5 inline-block h-4 w-2 bg-amber-500 align-middle ${reduceMotion ? "" : "animate-pulse"}`}
                />
            )}
        </section>
    );
}
