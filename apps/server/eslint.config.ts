// @ts-check
import importPlugin from 'eslint-plugin-import';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
    },
    rules: {
      // 禁止使用 any 类型
      '@typescript-eslint/no-explicit-any': 'error',
      // 禁止使用已废弃的 API，如 z.uuid()，请使用最新的替代方法
      '@typescript-eslint/no-deprecated': ['error'],
    },
  },
]);
