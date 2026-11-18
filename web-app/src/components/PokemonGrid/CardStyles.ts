export class CardStyles {
    static readonly GRID =
        "grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-6";

    static readonly FRAME =
        "h-full rounded-2xl bg-gradient-to-r from-amber-300 via-amber-100 to-amber-300 p-1 shadow-md dark:from-slate-600 dark:via-slate-500 dark:to-slate-600";

    static readonly BODY =
        "flex h-full flex-col gap-3 rounded-2xl bg-white/70 p-4 text-slate-800 dark:bg-slate-900/80 dark:text-slate-100";

    static readonly IMAGE =
        "mx-auto aspect-square w-full max-w-[12rem] rounded-xl bg-white outline outline-2 outline-amber-400 dark:bg-blue-950 dark:outline-slate-500";
}
