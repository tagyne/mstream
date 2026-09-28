import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/api/src/**/*.ts', 'apps/web/src/**/*.{ts,tsx}'],
    rules: {
      // TypeScript's compiler already checks name resolution more accurately.
      'no-undef': 'off',
    },
  },
  {
    files: ['apps/api/src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  eslintConfigPrettier,
);
