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
- **Rate Limiting**: Protection against API abuse (100 req/15min)
- **Security Hardened**: Helmet and CORS configured
- **Normalized Relations**: Decisions linked to alerts via foreign keys
- **Optimized Indexes**: Fast queries on common fields


## 🚀 Quick Start with Docker

### Using Docker Compose (Recommended)

1. Copy the file ``docker-compose.yml`` provided on this repository.
2. Set the correct values on the environment variables.
3. Run ``docker compose up -d``.

### Using Docker CLI

```bash
docker run -d \
  -p 3000:3000 \
  -e CROWDSEC_LAPI_URL=http://your-crowdsec-server:8080 \
  -e CROWDSEC_USER=your_machine_id \
  -e CROWDSEC_PASSWORD=your_password \
  -e DATA_RETENTION=7d \
  -e SYNC_SCHEDULE="*/5 * * * *" \
  -v $(pwd)/database:/app/database \
  --name crowdsec-monitor-api \
  crowdsec-monitor-api
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | API server port | `3000` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `CROWDSEC_LAPI_URL` | CrowdSec LAPI URL | `http://localhost:8080` | Yes |
| `CROWDSEC_USER` | CrowdSec machine ID | - | Yes |
| `CROWDSEC_PASSWORD` | CrowdSec password | - | Yes |
| `DB_PATH` | SQLite database path | `./database/crowdsec.db` | No |
| `DATA_RETENTION` | Auto-delete old data period | - (disabled) | No |
| `SYNC_SCHEDULE` | Cron schedule for sync | `*/5 * * * *` | No |

#### Data Retention Examples

Configure `DATA_RETENTION` to automatically delete old alerts and decisions:
- `1d` - Keep only last 24 hours
- `7d` - Keep only last 7 days
- `2w` - Keep only last 2 weeks
- `1m` - Keep only last 30 days
- `3m` - Keep only last 90 days
- `1y` - Keep only last year

If not set, data is retained indefinitely.

#### Sync Schedule Examples

- `*/5 * * * *` - Every 5 minutes (default)
- `*/15 * * * *` - Every 15 minutes
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight


## 🔄 How Synchronization Works

The API automatically syncs data from CrowdSec LAPI based on the configured `SYNC_SCHEDULE`:

1. **Connects** to CrowdSec LAPI using Watcher credentials
2. **Fetches** new alerts from LAPI
3. **Checks** if alerts already exist (by alert ID)
4. **Inserts** only new alerts and their decisions
5. **Skips** existing alerts to prevent duplicates
6. **Cleans up** old data based on `DATA_RETENTION` (if configured)
7. **Tracks** last successful sync timestamp for monitoring

The database is **not a cache** - it's a permanent incremental storage. Configure `DATA_RETENTION` to automatically remove old data and prevent the database from growing indefinitely.


## 🔒 Security

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet**: Security headers configured
- **CORS**: Cross-origin requests controlled
- **Input Validation**: express-validator on all query parameters
- **Environment Variables**: Sensitive data stored securely


## API endpoints documentation

See [API.md](./API.md) for complete response schemas and examples.

## 📄 License

ISC

## 👤 Author

JGeek00
