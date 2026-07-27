import pluginJs from '@eslint/js';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import jestDom from 'eslint-plugin-jest-dom';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import perfectionist from 'eslint-plugin-perfectionist';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import testingLibrary from 'eslint-plugin-testing-library';
import globals from 'globals';

// The strictest typescript-eslint presets, scoped to this project's files.
// They ship without a `files` key, so they would otherwise try to apply to
// every extension (including .css and .json assets).
const typeCheckedPresets = [
  ...tseslintPlugin.configs['flat/strict-type-checked'],
  ...tseslintPlugin.configs['flat/stylistic-type-checked'],
].map((config) => ({ ...config, files: ['**/*.{ts,tsx}'] }));

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  // Common rules for JavaScript files
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-promise-executor-return': 'error',
      'no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // Base JavaScript rules for TypeScript too. This must precede the presets
  // below, which switch off the base rules that TypeScript itself covers
  // (no-unused-vars, no-undef, ...) in favour of type-aware equivalents.
  {
    files: ['**/*.{ts,tsx}'],
    rules: pluginJs.configs.recommended.rules,
  },

  // Every rule the strict + stylistic type-checked presets carry, before the
  // project's own overrides below.
  ...typeCheckedPresets,

  // TypeScript-specific rules
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslintPlugin,
      'simple-import-sort': simpleImportSort,
      perfectionist,
    },
    rules: {
      // Interpolating a number is ordinary and safe; the rule's real target
      // is stringifying objects and unions of unknown shape.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
      // Spreading a string is code-point-correct, which is all this game
      // needs: every letter it handles is ASCII A-Z by construction (the
      // dictionary is validated as /^[A-Z]+$/).
      '@typescript-eslint/no-misused-spread': ['error', { allow: ['string'] }],
      'perfectionist/sort-classes': ['error', { type: 'unsorted' }],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            // Allow async functions in JSX attributes (onClick, onSubmit, etc.).
            // This is done because of async functions are regularly passed to
            // React event handlers and that is considered 'normal'.
            attributes: false,
          },
        },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/consistent-type-imports': ['error'],
      '@typescript-eslint/consistent-type-exports': [
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      'no-promise-executor-return': 'error',
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // React hooks rules
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
    },
  },

  // Accessibility rules for JSX. The game leans on dialogs, live regions and
  // labelled controls, so regressions here are worth failing a build over.
  {
    files: ['**/*.tsx'],
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
    },
  },

  // Testing Library rules - only for test files
  {
    files: ['**/__tests__/**/*.test.{ts,tsx}'],
    plugins: {
      'testing-library': testingLibrary,
    },
    rules: {
      ...testingLibrary.configs['flat/react'].rules,
    },
  },

  // Jest DOM rules - only for test files
  {
    files: ['**/__tests__/**/*.test.{ts,tsx}'],
    plugins: {
      'jest-dom': jestDom,
    },
    rules: {
      ...jestDom.configs['flat/recommended'].rules,
    },
  },

  // Browser globals
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Ignores
  {
    ignores: ['dist/**/*', 'coverage/**/*'],
  },
];

export default eslintConfig;
