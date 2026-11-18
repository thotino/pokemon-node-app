import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { PaginationService } from "../services/PaginationService";

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    siblings?: number;
}

const BUTTON_CLASSES =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 font-semibold text-slate-700 transition-colors hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-100 dark:hover:bg-slate-700";

const CURRENT_CLASSES =
    "bg-amber-400 text-slate-900 hover:bg-amber-400 dark:bg-amber-300 dark:text-slate-900 dark:hover:bg-amber-300";

export function Pagination({
    page,
    totalPages,
    onPageChange,
    siblings,
}: PaginationProps) {
    if (totalPages <= 1) {
        return null;
    }

    const current = PaginationService.clamp(page, totalPages);
    const goTo = (target: number) => {
        const next = PaginationService.clamp(target, totalPages);
        if (next !== current) {
            onPageChange(next);
        }
    };

    return (
        <nav aria-label="Pagination" className="flex justify-center px-4 py-6">
            <ul className="flex items-center gap-1">
                <li>
                    <button
                        type="button"
                        aria-label="Previous page"
                        disabled={current === 1}
                        onClick={() => goTo(current - 1)}
                        className={BUTTON_CLASSES}
                    >
                        <IoIosArrowBack aria-hidden="true" />
                    </button>
                </li>

                {PaginationService.items(current, totalPages, siblings).map(
                    item =>
                        typeof item === "number" ? (
                            <li key={item} className="hidden sm:block">
                                <button
                                    type="button"
                                    aria-label={`Page ${item}`}
                                    aria-current={
                                        item === current ? "page" : undefined
                                    }
                                    onClick={() => goTo(item)}
                                    className={`${BUTTON_CLASSES} ${item === current ? CURRENT_CLASSES : ""}`}
                                >
                                    {item}
                                </button>
                            </li>
                        ) : (
                            <li
                                key={item}
                                aria-hidden="true"
                                className="hidden px-1 text-slate-500 sm:block dark:text-slate-400"
                            >
                                …
                            </li>
                        ),
                )}

                <li className="px-3 text-sm font-semibold text-slate-700 sm:hidden dark:text-slate-100">
                    Page {current} / {totalPages}
                </li>

                <li>
                    <button
                        type="button"
                        aria-label="Next page"
                        disabled={current === totalPages}
                        onClick={() => goTo(current + 1)}
                        className={BUTTON_CLASSES}
                    >
                        <IoIosArrowForward aria-hidden="true" />
                    </button>
                </li>
            </ul>
        </nav>
    );
}
