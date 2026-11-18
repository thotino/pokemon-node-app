import { Pokemon } from "../../entities/Pokemon";
import { CardStyles } from "./CardStyles";

export function CardSkeleton() {
    return (
        <div
            aria-hidden="true"
            data-testid="card-skeleton"
            className={CardStyles.FRAME}
        >
            <div className={`${CardStyles.BODY} motion-safe:animate-pulse`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-2">
                        <div className="h-4 w-24 rounded bg-slate-300 dark:bg-slate-700" />
                        <div className="h-3 w-10 rounded bg-slate-300 dark:bg-slate-700" />
                    </div>
                    <div className="h-5 w-5 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>
                <div className={`${CardStyles.IMAGE} outline-slate-300`} />
                <div className="mt-auto space-y-2">
                    {Pokemon.MAIN_STATS.map(([key]) => (
                        <div
                            key={key}
                            className="h-3 rounded bg-slate-300 dark:bg-slate-700"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
