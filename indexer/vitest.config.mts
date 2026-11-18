import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        mockReset: true,
        exclude: ['dist/**', 'node_modules/**'],
    },
});
