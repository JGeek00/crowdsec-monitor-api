import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@tests': path.resolve(__dirname, 'tests'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/index.ts',
        'src/types/**',
        'src/models/in/**',
        'src/models/out/**',
        'src/models/shared/**',
        'src/models/db/**',
        'src/models/entities/**',
        'src/migrations/**',
        'src/server.ts',
        // Covered by the integration/e2e suites (api-tests spec, FR-007):
        // excluded from the unit-coverage scope because they require a DB/app bootstrap.
        'src/controllers/**', // tests/controllers
        'src/routes/**', // tests/routes
        'src/sockets/**', // tests/sockets + tests/e2e-*
        'src/middlewares/**', // tests/middlewares
        'src/helpers/**', // exercised via tests/controllers + tests/routes
        'src/app.ts', // tests/app.test.ts
        'tests/lapi-mock.ts',
        'tests/openapi-validator.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
