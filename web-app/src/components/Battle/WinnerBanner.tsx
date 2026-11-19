import type { Pokemon } from "../../entities/Pokemon";

interface WinnerBannerProps {
    winner?: Pokemon;
    winnerName?: string;
}

export function WinnerBanner({ winner, winnerName }: WinnerBannerProps) {
    const name = winner?.name ?? winnerName;

    if (name == null) {
        return (
            <p className="rounded-2xl bg-slate-200 p-4 text-center text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                No winner was announced.
            </p>
        );
    }

    return (
        <div className="flex items-center justify-center gap-4 rounded-2xl bg-amber-300 p-4 text-slate-900 shadow">
            {winner && (
                <img
                    src={winner.sprite}
                    alt=""
                    width={64}
                    height={64}
                    className="rounded-full bg-white"
                />
            )}
            <p className="text-2xl">
                Winner: <strong className="capitalize">{name}</strong>
            </p>
        </div>
    );
}
