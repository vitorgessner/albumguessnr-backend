import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        ignores: ['**/*.config.ts'],
        languageOptions: {
            parser: tsParser,
            globals: {
                process: 'readonly',
                console: 'readonly',
                ...globals.browser,
            },
        },
        plugins: {
            '@typescript-eslint': ts,
            prettier: prettier,
        },
        rules: {
            // Enforce the use of single quotes for strings
            quotes: ['error', 'single'],
            // Enforce semicolons at the end of statements
            semi: ['error', 'always'],
            // Enforce consistent line breaks (LF for Unix)
            'linebreak-style': ['error', 'unix'],
            // Require the use of === and !== (no implicit type conversions)
            eqeqeq: ['error', 'always'],
            // Enforce a maximum line length (usually 80 or 100 characters)
            'max-len': ['error', { code: 100 }],
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            // Enable Prettier as a lint rule
            'prettier/prettier': [
                'error',
                {
                    singleQuote: true,
                    semi: true,
                },
            ],
        },
    },
];
