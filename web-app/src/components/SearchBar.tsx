import { type FormEvent, useId, useState } from "react";
import { IoIosClose, IoIosSearch } from "react-icons/io";

interface SearchBarProps {
    value: string;
    onSubmit: (value: string) => void;
}

const BUTTON_CLASSES =
    "inline-flex h-10 items-center justify-center gap-1 rounded-full px-4 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500";

export function SearchBar({ value, onSubmit }: SearchBarProps) {
    const inputId = useId();
    const [draft, setDraft] = useState(value);
    const [syncedValue, setSyncedValue] = useState(value);

    if (value !== syncedValue) {
        setSyncedValue(value);
        setDraft(value);
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit(draft.trim());
    };

    const handleClear = () => {
        setDraft("");
        if (value !== "") {
            onSubmit("");
        }
    };

    return (
        <form
            role="search"
            onSubmit={handleSubmit}
            className="flex w-full items-center gap-2"
        >
            <label htmlFor={inputId} className="sr-only">
                Search Pokémon by name
            </label>
            <div className="relative flex-1">
                <IoIosSearch
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                />
                <input
                    id={inputId}
                    type="search"
                    name="q"
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                    placeholder="Search a Pokémon…"
                    autoComplete="off"
                    enterKeyHint="search"
                    className="h-10 w-full rounded-full border border-amber-300 bg-white pl-9 pr-10 text-slate-800 placeholder:text-slate-400 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 [&::-webkit-search-cancel-button]:hidden"
                />
                {draft !== "" && (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={handleClear}
                        className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        <IoIosClose aria-hidden="true" className="text-xl" />
                    </button>
                )}
            </div>
            <button
                type="submit"
                className={`${BUTTON_CLASSES} bg-amber-400 text-slate-900 shadow hover:bg-amber-300`}
            >
                Search
            </button>
        </form>
    );
}
