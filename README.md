# CrowdSec Monitor API

A RESTful API to monitor and query data from CrowdSec LAPI (Local API) using Express.js, SQLite3, and Sequelize with TypeScript.

## 📖 Overview

CrowdSec Monitor API provides a persistent storage layer and query interface for CrowdSec security alerts and decisions. It automatically syncs data from your CrowdSec LAPI instance and stores it in a local SQLite database, allowing you to query historical data, generate statistics, and monitor your security posture over time.

### Key Features

- **Incremental Database**: All CrowdSec data is stored permanently in SQLite
- **Automatic Synchronization**: Only new alerts are added, preventing duplicates
- **Watcher Authentication**: Secure login with machine_id/password and JWT Bearer tokens
- **RESTful API**: Well-structured endpoints for alerts and decisions
- **TypeScript**: Strong typing for improved security and maintainability
- **Rate Limiting**: Protection against API abuse
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
| `SYNC_SCHEDULE` | Cron schedule for sync | `*/5 * * * *` | No |

#### Sync Schedule Examples

- `*/5 * * * *` - Every 5 minutes (default)
- `*/15 * * * *` - Every 15 minutes
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight

## 📡 API Endpoints

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Check API status |

**Response:**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-02-13T10:30:45.123Z"
}
```

### Alerts

| Method | Endpoint | Description | Query Parameters |
|--------|----------|-------------|------------------|
| GET | `/api/v1/alerts` | Get all alerts | `limit`, `offset`, `unpaged`, `scenario`, `simulated` |
| GET | `/api/v1/alerts/:id` | Get alert by ID | - |
| GET | `/api/v1/alerts/stats` | Get alert statistics | - |

**Pagination Parameters:**
- `limit` (optional): Number of items to return (default: 100). Must be a positive integer.
- `offset` (optional): Starting index (default: 0). Must be a non-negative integer and not greater than total items.
- `unpaged` (optional): Set to `true` to disable pagination and return all results. Must be a boolean (true/false).

> **Note:** All parameters are validated using express-validator. Invalid values return a 400 Bad Request with detailed error messages.

**Example Request:****
```bash
curl http://localhost:3000/api/v1/alerts?limit=10&scenario=ssh-bf
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "abc-123-def",
      "scenario": "crowdsecurity/ssh-bf",
      "message": "Ip 192.168.1.100 performed ssh-bf attack",
      "source": {
        "ip": "192.168.1.100",
        "scope": "Ip",
        "cn": "US"
      },
      "simulated": false,
      "events_count": 6
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0
  }
}
```

### Decisions

| Method | Endpoint | Description | Query Parameters |
|--------|----------|-------------|------------------|
| GET | `/api/v1/decisions` | Get all decisions | `limit`, `offset`, `unpaged`, `type`, `scope`, `value`, `simulated` |
| GET | `/api/v1/decisions/:id` | Get decision by ID | - |
| GET | `/api/v1/decisions/active` | Get recent decisions (last 100) | - |
| GET | `/api/v1/decisions/stats` | Get decision statistics | - |

**Pagination Parameters:**
- `limit` (optional): Number of items to return (default: 100). Must be a positive integer.
- `offset` (optional): Starting index (default: 0). Must be a non-negative integer and not greater than total items.
- `unpaged` (optional): Set to `true` to disable pagination and return all results. Must be a boolean (true/false).

> **Note:** All parameters are validated using express-validator. Invalid values return a 400 Bad Request with detailed error messages.

**Example Request:****
```bash
curl http://localhost:3000/api/v1/decisions?type=ban&limit=20
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "crowdsec_decision_id": 98765,
      "alert_id": 1,
      "type": "ban",
      "scope": "Ip",
      "value": "192.168.1.100",
      "duration": "4h",
      "scenario": "crowdsecurity/ssh-bf",
      "simulated": false
    }
  ],
  "pagination": {
    "total": 75,
    "limit": 20,
    "offset": 0
  }
}
```

## 🔄 How Synchronization Works

The API automatically syncs data from CrowdSec LAPI based on the configured `SYNC_SCHEDULE`:

1. **Connects** to CrowdSec LAPI using Watcher credentials
2. **Fetches** new alerts from LAPI
3. **Checks** if alerts already exist (using `crowdsec_alert_id`)
4. **Inserts** only new alerts and their decisions
5. **Skips** existing alerts to prevent duplicates
6. **Persists** all data indefinitely in SQLite

The database is **not a cache** - it's a permanent incremental storage that grows over time with your security data.


## 🔒 Security

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet**: Security headers configured
- **CORS**: Cross-origin requests controlled
- **Environment Variables**: Sensitive data stored securely


## 📝 API Response Format

All responses follow this structure:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0
  }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

## 📄 License

ISC

## 👤 Author

JGeek00
