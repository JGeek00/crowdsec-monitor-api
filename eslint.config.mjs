import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,

  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  ...tseslint.configs.recommended,

  {
    rules: {
      'no-console': 'off',
      'no-return-await': 'warn',
      eqeqeq: 'error',
      curly: ['error', 'all'],
      'no-throw-literal': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'error',
      // Allow `{}` and empty interfaces (Sequelize model patterns, Express types)
      '@typescript-eslint/no-empty-object-type': 'warn',
      // Allow dynamic require() for runtime package.json reads
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  prettierRecommended,

  {
    ignores: ['dist/', 'node_modules/', 'scripts/', 'dist-obfuscated/'],
  },
);
