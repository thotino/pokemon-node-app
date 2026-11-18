import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/ThemeContext";
import PokemonApp from "./components/PokemonApp";
import { queryClient } from "./lib/queryClient";

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <PokemonApp />
            </ThemeProvider>
        </QueryClientProvider>
    );
}
