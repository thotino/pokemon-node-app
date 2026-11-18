import React from "react";
import { Header } from "./Header";
import { PokemonGrid } from "./PokemonGrid/PokemonGrid";

const PokemonApp: React.FC = () => {
    return (
        <div className="flex min-h-screen flex-col items-center bg-amber-50 dark:bg-slate-800">
            <Header />
            <main className="w-full max-w-screen-2xl">
                <PokemonGrid />
            </main>
        </div>
    );
};

export default PokemonApp;
