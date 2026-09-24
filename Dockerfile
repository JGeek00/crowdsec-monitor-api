#################
## BUILD STAGE ##
#################
FROM node:24-slim AS builder

ARG PNPM_VERSION=12.6.0

WORKDIR /app

# Build dependencies: node-gyp toolchain for native modules (@vscode/sqlite3)
# and libatomic for the pnpm native binary
RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY tsconfig.app.json ./
COPY tsconfig.base.json ./

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY src ./src
COPY scripts ./scripts

# Build application
RUN pnpm run build:prod

# Prune to production-only dependencies (the production stage copies
# node_modules directly, so it doesn't need pnpm or the build toolchain)
RUN pnpm prune --prod



######################
## PRODUCTION STAGE ##
######################
FROM node:24-slim AS production

WORKDIR /app

# libatomic: required by the native SQLite binding at runtime
RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 && rm -rf /var/lib/apt/lists/*

# Copy built files and production dependencies from the builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Create database directory
RUN mkdir -p /app/database

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/v1/health || exit 1

# Start application
CMD ["node", "dist/server.js"]
