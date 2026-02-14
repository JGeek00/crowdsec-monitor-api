# 🛠️ Development & Build

## Development Mode

Run the API in development mode with hot-reload:

```bash
npm install
npm run dev
```

## Production Build

The production build process compiles TypeScript and obfuscates the resulting JavaScript code for enhanced security:

```bash
npm run build:prod
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
| `npm run build` | Full build: compile + obfuscate |
| `npm run build:compile` | Compile TypeScript only (no obfuscation) |
| `npm run build:obfuscate` | Obfuscate existing compiled code |
| `npm start` | Run production build from dist directory |
