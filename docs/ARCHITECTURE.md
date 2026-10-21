# Architecture

Technical overview of the CrowdSec Monitor API: how the codebase is organized, how the layers depend on each other, and how the main flows (HTTP requests, background jobs, sync, notifications) work.

## Stack

- **Runtime**: Node.js with **TypeScript**
- **HTTP framework**: Express.js
- **ORM**: Sequelize v7 (SQLite or PostgreSQL, selected by `DB_MODE`)
- **Real-time**: WebSockets (native `upgrade` handling, no external gateway)
- **Tests**: Vitest
- **Package manager**: pnpm

## Architectural style

The codebase follows a **layered / hexagonal (ports & adapters) architecture**. The dependency rule is one-directional:

```
delivery  ──►  application  ──►  domain
                  ▲
infrastructure ───┘  (implements application ports)
```

- `domain` and `application` never import from `infrastructure` or `delivery`.
- `application` defines **ports** (interfaces); `infrastructure` provides the **adapters** that implement them.
- Wiring happens in a single **composition root** (`src/container.ts`), a manual dependency-injection container with no framework.

## Source layout

```
src/
├── server.ts               # Process entry point
├── server-bootstrap.ts     # Bootstrap steps (env validation, DB, LAPI, notifications)
├── app.ts                  # Express app factory + job registry builder
├── container.ts            # Composition root (manual DI)
├── config/                 # Environment config, DB connection (SQLite/Postgres)
├── constants/              # App defaults, regexps, providers, scenarios
├── shared/                 # Cross-layer models, utils, CrowdSec types
├── domain/                 # Pure business model (no I/O)
│   ├── entities/           # Alert, Decision, Blocklist, Notification, ...
│   ├── value-objects/      # IpAddress, BlocklistUrl, Pagination, Retention, ...
│   ├── errors/             # DomainError hierarchy (NotFound, Conflict, Validation, ...)
│   └── events/             # AlertSynced, BlocklistRefreshed
├── application/            # Use cases and ports
│   ├── use-cases/          # alerts/, decisions/, blocklists/, notifications/, statistics/, status/
│   ├── ports/              # Repository, LAPI client, bouncer, clock, logger, unit-of-work, ...
│   └── jobs/               # Job definitions (factories) scheduled at startup
├── infrastructure/         # Adapters implementing the ports
│   ├── crowdsec/           # LAPI HTTP client, bouncer client, allowlists, blocklist sources
│   ├── persistence/        # Sequelize models, repositories, mappers, migrations
│   ├── sync/               # Alerts sync, blocklist refresh pipeline, allowlist filter
│   ├── notifications/      # Notification engine, channel dispatcher, sender, history
│   ├── scheduling/         # Interval scheduler + job registry
│   ├── status/             # Monitor status store, process tracker
│   └── system/             # Logger, clock, version checker
└── delivery/               # Inbound adapters
    ├── http/               # Express: routes, controllers, middlewares, schemas, presenters
    ├── websocket/          # WS gateway + channels (status)
    └── mcp/                # MCP server (Streamable HTTP, stateless) + tool registry
```

## Layers

### Domain (`src/domain`)

Pure TypeScript, zero framework dependencies. Entities represent the persistent business objects (alerts, decisions, blocklists and their IPs, CrowdSec blocklists, notifications). Value objects encapsulate validation (IP addresses, blocklist URLs, pagination, retention). A small error hierarchy (`DomainError` → `NotFoundError`, `ConflictError`, `ValidationError`, `ServiceUnavailableError`, ...) maps later to HTTP status codes in the delivery layer.

### Application (`src/application`)

- **Use cases**: one class per operation (`ListAlertsUseCase`, `CreateDecisionUseCase`, `CheckIpUseCase`, `GetGeneralStatisticsUseCase`, ...). They receive their dependencies through constructor-injected ports and return domain data — they never touch Express, Sequelize or HTTP directly.
- **Ports** (`application/ports`): the interfaces use cases depend on — alert/decision/blocklist/notification repositories, LAPI client, bouncer client, blocklist source, unit of work, clock, logger, status store, notification engine/sender, version checker.
- **Jobs** (`application/jobs`): pure factories (`buildSyncAlertsJob`, `buildLapiHealthJob`, ...) that receive dependencies and expose `run()` callbacks. Scheduling itself lives in infrastructure.

### Infrastructure (`src/infrastructure`)

Adapters that implement the application ports:

- **crowdsec/** — `http-lapi-client` authenticates against the CrowdSec LAPI and wraps its endpoints (`lapi/alerts`, `lapi/decisions`, `lapi/allowlists`); `http-bouncer-client` pushes/removes decisions using the bouncer key.
- **persistence/** — Sequelize v7 models (`Alerts`, `Decisions`, `Blocklists`, `BlocklistIps`, `CsBlocklists`, `Notifications`, `NotificationChannels`, `Migration`), repository implementations, row↔entity mappers, and versioned migrations (`migrations/`) plus a legacy migration runner. SQLite and PostgreSQL are supported through the same Sequelize API; the temp DB (`:memory:`) uses a single-connection pool.
- **sync/** — `alerts-sync` pulls alerts from LAPI incrementally (no duplicates); `blocklists-refresh-pipeline` re-fetches external blocklist URLs, filters entries against allowlists, and activates/deactivates decisions on CrowdSec via the bouncer client.
- **notifications/** — the engine evaluates notification rules when alerts sync; the dispatcher sends messages through the configured channels (providers in `constants/notification-providers.ts`) and records delivery history.
- **scheduling/** — `JobRegistry` + interval scheduler run the periodic jobs with stable ids and configurable intervals.
- **status/** — in-memory status store (LAPI connectivity, last successful sync, version) exposed via HTTP and WebSocket.

### Delivery (`src/delivery`)

Inbound adapters that translate transport-specific input into use-case calls:

- **http/** — Express application organized as:
  - `routes/` — one router per resource, mounted under `/api/v1` with `AuthMiddleware`.
  - `controllers/` — thin handlers grouped by resource (`alerts`, `decisions`, `lists/blocklists`, `lists/allowlists`, `statistics`, `notifications`, `status`).
  - `schemas/` — request validation models (params, query, body) + validators per domain.
  - `presenters/` — response DTO models that shape the API contract.
  - `middlewares/` — auth, validation, error handler, not-found, deprecation warnings.
- **websocket/** — `WebSocketApp` intercepts the HTTP server `upgrade` event, authenticates with the same middleware, and routes to registered channels. Currently `/api/v1/status` streams status snapshots.
- **mcp/** — Model Context Protocol server (`server.ts` factory + `tools/` registry + `http.ts` Streamable HTTP transport). Every tool calls the same application use cases as the HTTP and WebSocket layers. Exposed scope: statistics (all), alerts (all), decisions (all), blocklists/allowlists (list + detail + single-IP check); notifications are intentionally absent. Authentication reuses `AuthMiddleware.expressAuth`, so the Bearer-token rule is exactly the REST one. See [MCP.md](./MCP.md).

## Composition root

`src/container.ts` builds the object graph eagerly on first import, in order: infrastructure adapters → repositories → use cases (ports injected). `app.ts` uses it to construct:

1. `buildApp()` — the Express app (helmet, CORS, optional rate limiting on `/api/v1/`, JSON parsing, morgan logging, routes, error middlewares).
2. `buildJobRegistry()` — the five periodic jobs wired to their dependencies.

`src/server.ts` orchestrates startup: environment validation → database init → LAPI and bouncer checks → notification engine load → initial data sync → job scheduling → HTTP listener → WebSocket gateway. Shutdown handlers stop jobs and close connections gracefully.

## Background jobs

| Job | Purpose | Default schedule |
|-----|---------|------------------|
| LAPI health check | Verifies connectivity to CrowdSec LAPI and triggers sync when reachable | `lapiCheck.intervalSeconds` |
| Sync alerts | Incrementally pulls new alerts/decisions from LAPI into the local DB | `sync.intervalSeconds` |
| Refresh blocklists | Re-fetches user-defined blocklist URLs and syncs decisions to CrowdSec | `blocklists.refreshTimeSeconds` |
| Sync CrowdSec blocklists | Imports blocklists managed by the CrowdSec console | `crowdsecBlocklists.refreshTimeSeconds` |
| Version check | Compares running version against the latest GitHub release | 3600 s (runs on boot) |

## Request flow

Every request passes through the same three stages, mirroring the layer structure. Reading a single alert (`GET /api/v1/alerts/:id`) end to end:

```
   Client
     │  GET /api/v1/alerts/123        (Bearer token, if API_PASSWORD is set)
     ▼
┌─────────────────── delivery/http ───────────────────┐
│  Global middlewares:                                │
│    helmet → CORS → rate limit → JSON parsing        │
│  Route middleware:                                  │
│    AuthMiddleware (Bearer check)                    │
│  Router: /alerts/:id  ──►  detail.controller        │
│    1. validates params (schemas/alerts)             │
│    2. calls the use case                            │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌──────────────── application ────────────────────────┐
│  GetAlertUseCase (business rules only)              │
│    depends on AlertRepository port (an interface)   │
└──────────────────────┬──────────────────────────────┘
                       ▼  (port implemented by)
┌─────────────── infrastructure ──────────────────────┐
│  SequelizeAlertRepository                           │
│    maps rows → Alert entity                         │
│    Sequelize query ──►  SQLite / PostgreSQL         │
└──────────────────────┬──────────────────────────────┘
                       ▼  entity travels back up
┌────────────────── delivery/http ────────────────────┐
│  Presenter shapes the entity into the API contract  │
│  200 OK ──► JSON response                           │
└─────────────────────────────────────────────────────┘
```

Two variations of this happy path:

- **Errors**: a use case throws a `DomainError` (e.g. `NotFoundError` for an unknown id); the error middleware at the end of the Express chain maps it to the typed error response with the right status code.
- **Writes to CrowdSec**: operations that affect CrowdSec itself (create/delete decision, delete alert, blocklist refresh) additionally call the LAPI/bouncer clients through their ports. The sync services keep the local database consistent with what CrowdSec returns.

The full endpoint reference, parameters and examples live in [API.md](./API.md).

Authentication is optional: when `API_PASSWORD` is set, protected resources require `Authorization: Bearer <password>`; when unset, all endpoints are open.

## Key design decisions

- **Manual DI over a framework container** (`container.ts`): explicit factories, no reflection, easy to follow and test.
- **Ports & adapters**: use cases are testable without Express/Sequelize; infrastructure can be swapped (e.g., DB mode) without touching business logic.
- **Store↔tracker cycle broken at the composition root**: the status store pulls process snapshots through an injected provider instead of a circular import.
- **Incremental sync with an integrated blocklist manager**: the API owns persistence and blocklist orchestration, so clients (iOS/Android apps) only consume the REST/WS surface.
- **MCP as a delivery adapter**: the MCP tools reuse the same use cases, enforcing a single application core. Endpoint: `POST /mcp` (stateless; `GET`/`DELETE` answer 405), mounted separately from the REST API with its own optional rate limit (`MCP_RATE_LIMIT`).
