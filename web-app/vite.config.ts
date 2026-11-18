/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_PROXY_TARGET =
    process.env.API_PROXY_TARGET ?? "http://localhost:3001";

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": {
                target: API_PROXY_TARGET,
                changeOrigin: true,
                rewrite: path => path.replace(/^\/api/, ""),
            },
        },
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/test/setup.ts"],
        css: false,
    },
});
