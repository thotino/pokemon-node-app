import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['dist/**', 'node_modules/**'],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['**/*.ts'],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		files: ['**/*.test.ts'],
		plugins: {
			vitest,
		},
		rules: {
			...vitest.configs.recommended.rules,
		},
	},
);
