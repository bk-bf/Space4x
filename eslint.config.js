import js from '@eslint/js';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import { includeIgnoreFile } from '@eslint/compat';
import { fileURLToPath } from 'node:url';

const GITIGNORED = includeIgnoreFile(fileURLToPath(new URL('.gitignore', import.meta.url)));

export default ts.config(
  GITIGNORED,
  { ignores: ['static/**', 'mockup/**', '.claude/**', '**/*.json'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ['**/*.svelte', '**/*.svelte.ts'], languageOptions: { parserOptions: { parser: ts.parser } } },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  }
);
