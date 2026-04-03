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
