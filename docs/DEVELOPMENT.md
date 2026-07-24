# 🛠️ Development & Build

## Prerequisites

This project uses pnpm. Installation guide [here](https://pnpm.io/installation).

## Development Mode

Run the API in development mode with hot-reload:

```bash
pnpm install
pnpm dev
```

## Production Build

The production build process compiles TypeScript and obfuscates the resulting JavaScript code for enhanced security:

```bash
pnpm build:prod
```

This command performs two steps:
1. **Compilation**: TypeScript is compiled to JavaScript (without source maps or type declarations)
2. **Obfuscation**: JavaScript code is minified and obfuscated using advanced techniques:
   - Control flow flattening
   - Dead code injection
   - String array encoding (base64)
   - Identifier renaming (hexadecimal)
   - Self-defending code
   - String splitting and rotation

The resulting code in the `dist/` directory is ready for production deployment.

## Build Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Full build: compile + obfuscate |
| `pnpm build:compile` | Compile TypeScript only (no obfuscation) |
| `pnpm build:obfuscate` | Obfuscate existing compiled code |
| `pnpm start` | Run production build from dist directory |

## Version Bump Scripts

Versions follow the format `MAJOR.MINOR.BUGFIX` or `MAJOR.MINOR.BUGFIX-beta.N`.

Before running any bump script, make sure a changelog file exists at `changelog/vX.Y.Z.md` matching the new target version, otherwise the script will abort.

### Stable releases

| Command | Description |
|---------|-------------|
| `pnpm bump-version:major` | Bumps `X.0.0` — resets minor and bugfix |
| `pnpm bump-version:minor` | Bumps `x.X.0` — resets bugfix |
| `pnpm bump-version:bugfix` | Bumps `x.x.X` |

> If the current version is a beta (e.g. `1.8.0-beta.5`), these scripts **drop the beta suffix** and produce the stable version (`1.8.0`) without incrementing any number.

### Beta releases

| Command | Description |
|---------|-------------|
| `pnpm bump-version:major:beta` | Bumps `X.0.0-beta.1` — starts a new major beta |
| `pnpm bump-version:minor:beta` | Bumps `x.X.0-beta.1` — starts a new minor beta |
| `pnpm bump-version:bugfix:beta` | Bumps `x.x.X-beta.1` — starts a new bugfix beta |
| `pnpm bump-version:beta` | Bumps `x.x.x-beta.X` — increments the beta number |

> `bump-version:major:beta`, `bump-version:minor:beta` and `bump-version:bugfix:beta` **cannot be used if the current version is already a beta**. Use `bump-version:beta` instead.
>
> `bump-version:beta` **requires** the current version to already be a beta. Use one of the `:beta` variants above to start a new beta cycle.

### Examples

| Current version | Command | Result |
|---|---|---|
| `1.8.0` | `bump-version:major` | `2.0.0` |
| `1.8.0` | `bump-version:minor` | `1.9.0` |
| `1.8.0` | `bump-version:bugfix` | `1.8.1` |
| `1.8.0-beta.5` | `bump-version:major` | `2.0.0` |
| `1.8.0-beta.5` | `bump-version:minor` | `1.9.0` |
| `1.8.0-beta.5` | `bump-version:bugfix` | `1.8.1` |
| `1.8.0-beta.5` | `bump-version:beta` | `1.8.0-beta.6` |
| `1.8.0` | `bump-version:major:beta` | `2.0.0-beta.1` |
| `1.8.0` | `bump-version:minor:beta` | `1.9.0-beta.1` |
| `1.8.0` | `bump-version:bugfix:beta` | `1.8.1-beta.1` |

# Database Migrations

## Overview

The database migration system provides an automated way to apply schema changes to the PostgreSQL database. It uses a versioned migration approach where each migration is a self-contained unit with `up()` and `down()` functions.

## Architecture

### Components

1. **Migration Model** (`src/models/Migration.ts`)
   - Tracks applied migrations in a `migrations` table
   - Stores migration name and application timestamp
   - Ensures each migration is applied only once

2. **Migration Service** (`src/services/migrations/migration.service.ts`)
   - Manages migration state (check if applied, register, list)
   - Provides methods to identify pending migrations

3. **Migration Runner** (`src/services/migrations/migration-runner.service.ts`)
   - Discovers and executes migrations automatically
   - Loads migrations from `dist/migrations/` directory
   - Executes migrations in numeric order

4. **Migration Tasks** (`src/types/migration-task.types.ts`)
   - Defines the `MigrationTask` interface with `up()` and `down()` functions
   - Includes metadata for tracking and rollback support

### Migration File Format

Migrations are TypeScript files located in `src/migrations/` with the naming convention:

```
NNNN_migration_name.ts
```

Where `NNNN` is a 4-digit sequential number (e.g., `0001`, `0002`).

Example:
```typescript
import { sequelize } from '@/config/database';

export default {
  name: '0001_add_column_to_table',
  up: async () => {
    await sequelize.query(`
      ALTER TABLE table_name 
      ADD COLUMN new_column VARCHAR(255) DEFAULT 'default'
    `);
  },
  down: async () => {
    await sequelize.query(`
      ALTER TABLE table_name 
      DROP COLUMN new_column
    `);
  },
};
```

### Migration Execution Flow

1. **Initialization**: Creates/ensures the `migrations` table exists
2. **Discovery**: Loads all `.js` files from `dist/migrations/`
3. **Filtering**: Identifies pending migrations (not in database)
4. **Execution**: Runs pending migrations in numeric order
5. **Registration**: Records each successful migration in the database
6. **Rollback Support**: Each migration can be rolled back using `down()` function

## Database Schema

The `migrations` table:

```sql
CREATE TABLE migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Running Migrations

### Automatic Execution

Migrations are automatically run on application startup via the `MigrationRunner`. The runner:

1. Connects to the database
2. Ensures the migrations table exists
3. Scans `dist/migrations/` for migration files
4. Executes pending migrations in order
5. Logs progress and any errors

### Manual Execution

To manually trigger migrations (e.g., during development):

```bash
# After building the application
pnpm build:prod
pnpm start
```

The application will automatically run migrations on startup.

## Best Practices

1. **Version Control**: Always commit migration files to version control
2. **Atomic Changes**: Each migration should be atomic (all or nothing)
3. **Reversible**: Always provide a `down()` function for rollback
4. **Idempotent**: Column additions should check for existence
5. **Naming**: Use descriptive names that explain the change
6. **Testing**: Test migrations in a staging environment first

## Migration Examples

### Adding a Column

```typescript
export default {
  name: '0001_add_status_column',
  up: async () => {
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN status VARCHAR(50) DEFAULT 'active'
    `);
  },
  down: async () => {
    await sequelize.query(`
      ALTER TABLE users 
      DROP COLUMN status
    `);
  },
};
```

### Creating a Table

```typescript
export default {
  name: '0002_create_audit_logs',
  up: async () => {
    await sequelize.query(`
      CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await sequelize.query(`
      CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id)
    `);
  },
  down: async () => {
    await sequelize.query('DROP TABLE IF EXISTS audit_logs');
  },
};
```

### Adding Index

```typescript
export default {
  name: '0003_add_email_index',
  up: async () => {
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email 
      ON users(email)
    `);
  },
  down: async () => {
    await sequelize.query('DROP INDEX IF EXISTS idx_users_email');
  },
};
```

## Troubleshooting

### Migration Failed

If a migration fails:
1. Check the error logs for details
2. The migration is NOT marked as applied
3. You can manually rollback by running the `down()` function
4. Fix the migration and re-run

### Stuck Migration

If you're stuck on a migration:
1. Check database connectivity
2. Verify the migration file is correctly formatted
3. Ensure the database schema is compatible
4. Review error messages in application logs

### Duplicate Migration Error

If you see "duplicate column name" errors:
- This is expected and handled automatically
- The migration checks for column existence before adding
- Logs will indicate the column already exists

## Internal Implementation Details

### Loading Migrations

The `MigrationRunner` loads migrations as JavaScript modules:

```typescript
function loadMigration(filePath: string): any {
  const module = require(filePath);
  return module.default || module;
}
```

### Caching

Migrations are cached in memory during the `loadMigrations()` phase to avoid reloading on each execution.

### Error Handling

- Individual migration failures throw errors and stop execution
- The migration is NOT marked as applied on failure
- Error details are logged to console

