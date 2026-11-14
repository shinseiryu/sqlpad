import js from '@eslint/js';
import n from 'eslint-plugin-n';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'public/'] },
  js.configs.recommended,
  n.configs['flat/recommended-module'],
  {
    files: ['**/*.cjs'],
    ...n.configs['flat/recommended-script'],
  },
  {
    rules: {
      // Previously disabled under airbnb-base; kept off to avoid churn
      'no-prototype-builtins': 'off',
      // Match the previous airbnb-base settings
      'no-unused-vars': [
        'error',
        { args: 'after-used', caughtErrors: 'none', ignoreRestSiblings: true },
      ],
      // server.js is a CLI entry point and exits on fatal startup errors
      'n/no-process-exit': 'off',
    },
  },
  {
    files: ['test/**/*.js', 'drivers/*/test.js'],
    languageOptions: { globals: globals.mocha },
  },
  {
    files: ['eslint.config.js'],
    rules: { 'n/no-unpublished-import': 'off' },
  },
  prettier,
];
