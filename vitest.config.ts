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
      reporter: ['text', 'html', 'json-summary', 'json'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/index.ts',
        'src/server.ts',
        // HTTP/WS delivery wiring is covered by the integration/e2e suites:
        // excluded from the unit-coverage scope because they require a DB/app bootstrap.
        'src/delivery/http/controllers/**', // tests/integration/http
        'src/delivery/http/routes/**', // tests/integration/http
        'src/delivery/websocket/**', // tests/integration/websocket + tests/e2e
        'src/delivery/http/middlewares/**', // tests/unit/delivery/http/middlewares
        'src/infrastructure/sync/**', // exercised via tests/integration/http + tests/e2e (legacy helpers)
        'src/infrastructure/persistence/sequelize/migrations/**', // SQL migrations, applied at bootstrap
        'src/application/jobs/**', // thin bootstrap wiring, exercised via tests/e2e (legacy src/server.ts scope)
        'src/infrastructure/scheduling/job-registry.ts', // thin bootstrap wiring (legacy src/server.ts scope)
        'src/server-bootstrap.ts', // bootstrap wiring (legacy src/server.ts scope)
        'src/domain/events/**', // placeholder event types, no behavior yet
        'src/app.ts', // tests/integration/http/app.test.ts
        'tests/setup/**',
      ],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
});
