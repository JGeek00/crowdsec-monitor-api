# CrowdSec Monitor API

A RESTful API to monitor and query data from CrowdSec LAPI (Local API) using Express.js, SQLite3, and Sequelize with TypeScript.

## 📖 Overview

CrowdSec Monitor API provides a persistent storage layer and query interface for CrowdSec security alerts and decisions. It automatically syncs data from your CrowdSec LAPI instance and stores it in a local SQLite database, allowing you to query historical data, generate statistics, and monitor your security posture over time.

### Key Features

- **Incremental Database**: All CrowdSec data is stored permanently in SQLite
- **Automatic Synchronization**: Only new alerts are added, preventing duplicates
- **Watcher Authentication**: Secure login with machine_id/password and JWT Bearer tokens
- **RESTful API**: Well-structured endpoints for alerts and decisions
- **Pagination & Validation**: express-validator with configurable pagination
- **TypeScript**: Strong typing for improved security and maintainability
- **Rate Limiting**: Protection against API abuse (optional)
- **Security Hardened**: Helmet and CORS configured
- **Normalized Relations**: Decisions linked to alerts via foreign keys
- **Optimized Indexes**: Fast queries on common fields


## 🚀 Quick Start with Docker

1. Generate a random key: ``openssl rand -hex 32``
2. Create the machine on CrowdSec: ``cscli machines add crowdsec-monitor --password <generated_key> -f /dev/null``
3. Paste the generated key on the `CROWDSEC_PASSWORD` variable of the docker compose file.
4. Copy the file ``docker-compose.yml`` provided on this repository.
5. Set the correct values on the environment variables.
6. Run ``docker compose up -d``.

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CROWDSEC_LAPI_URL` | CrowdSec LAPI URL | `http://localhost:8080` | Yes |
| `CROWDSEC_USER` | CrowdSec machine ID | - | Yes |
| `CROWDSEC_PASSWORD` | CrowdSec password | - | Yes |
| `DB_PATH` | SQLite database path | `./database/crowdsec.db` | No |
| `DATA_RETENTION` | Auto-delete old data period | disabled | No |
| `SYNC_INTERVAL_SECONDS` | Interval in seconds between syncs | `30` | No |
| `API_PASSWORD` | Optional API authentication password | disabled | No |
| `RATE_LIMIT` | Rate limit in format `<requests>/<minutes>` | disabled | No |

#### Data Retention Examples

Configure `DATA_RETENTION` to automatically delete old alerts and decisions:
- `1d` - Keep only last 24 hours
- `7d` - Keep only last 7 days
- `2w` - Keep only last 2 weeks
- `1m` - Keep only last 30 days
- `3m` - Keep only last 90 days
- `1y` - Keep only last year

If not set, data is retained indefinitely.


#### API Authentication (Optional)

You can optionally secure your API with a password using the `API_PASSWORD` environment variable:

- If `API_PASSWORD` is **not set**: API endpoints are accessible without authentication
- If `API_PASSWORD` is **set**: All alert and decision endpoints require Bearer token authentication

**Example request with authentication:**
```bash
curl -H "Authorization: Bearer your_password_here" \
  http://localhost:3000/api/v1/alerts
```

**Security Note:** This is a **basic authentication mechanism** intended for simple deployments. For production environments, consider implementing more robust authentication methods such as:
- Basic Auth with HTTPS
- OAuth2 / OpenID Connect
- External Identity Provider (Auth0, Keycloak, etc.)
- API Gateway with advanced authentication

The `/api/v1/api-health` endpoint is always accessible without authentication.

#### Rate Limiting (Optional)

You can optionally configure rate limiting using the `RATE_LIMIT` environment variable:

- If `RATE_LIMIT` is **not set**: Rate limiting is disabled
- If `RATE_LIMIT` is **set**: API endpoints are rate-limited based on the configured value

**Format:** `<requests>/<minutes>`

**Examples:**
- `100/15` - 100 requests per 15 minutes (recommended default)
- `60/1` - 60 requests per minute
- `1000/60` - 1000 requests per hour
- `50/5` - 50 requests per 5 minutes

```bash
docker run -d \
  -e RATE_LIMIT=100/15 \
  ...
```


## 🔄 How Synchronization Works

The API automatically syncs data from CrowdSec LAPI based on the configured `SYNC_INTERVAL_SECONDS` interval:

1. **Connects** to CrowdSec LAPI using Watcher credentials
2. **Fetches** new alerts from LAPI
3. **Checks** if alerts already exist (by alert ID)
4. **Inserts** only new alerts and their decisions
5. **Overwrites** existing alerts to keep track of updates
6. **Cleans up** old data based on `DATA_RETENTION` (if configured)
7. **Tracks** last successful sync timestamp for monitoring

The database is **not a cache** - it's a permanent incremental storage. Configure `DATA_RETENTION` to automatically remove old data and prevent the database from growing indefinitely.


## 🔒 Security

- **Optional Authentication**: Bearer token authentication with `API_PASSWORD` (optional)
- **Rate Limiting**: Configurable rate limiting with `RATE_LIMIT` (optional)
- **Helmet**: Security headers configured
- **CORS**: Cross-origin requests controlled
- **Input Validation**: express-validator on all query parameters
- **Environment Variables**: Sensitive data stored securely


## API endpoints documentation

See [API.md](./API.md) for complete response schemas and examples.

## Disclaimer
This is an third party software that is not related in any way with the official CrowdSec software or with the CrowdSec team.

## 📄 License

MIT

## 👤 Author

JGeek00
