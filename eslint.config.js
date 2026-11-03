import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/storage/**',
      'packages/launcher/build/**',
      'packages/launcher/frontend/dist/**',
      'packages/launcher/frontend/wailsjs/**',
      'packages/admin/dist/**',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    files: ['packages/server/**/*.ts', 'packages/shared/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: [
      'packages/admin/**/*.{ts,vue}',
      'packages/launcher/frontend/**/*.{ts,vue}',
      'packages/website/**/*.js',
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['packages/website/**/*.js'],
    languageOptions: {
      sourceType: 'script',
    },
  },
  {
    files: ['eslint.config.js', 'packages/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      // 项目现有模板为紧凑写法，不强制逐属性换行/标签内换行。
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
