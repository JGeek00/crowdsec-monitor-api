# API Documentation

Complete API reference for CrowdSec Monitor API endpoints.

## Base URL

All endpoints are prefixed with `/api/v1`

```
http://localhost:3000/api/v1
```

## Authentication

The API does not require authentication for read operations. All endpoints communicate with CrowdSec LAPI using Watcher credentials configured via environment variables.

---

## Health & Status Endpoints

### GET `/api/v1/api-health`

Check if the API is running and responsive.

**Response:**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-02-13T10:30:45.123Z"
}
```

---

### GET `/api/v1/lapi-status`

Quick check of CrowdSec LAPI connection status and last successful data sync.

**Response (Connected):**
```json
{
  "success": true,
  "status": "connected",
  "message": "CrowdSec LAPI is reachable and authenticated",
  "lastSuccessfulSync": "2026-02-13T10:25:30.123Z",
  "timestamp": "2026-02-13T10:30:45.123Z"
}
```

**Response (Disconnected):**
```json
{
  "success": false,
  "status": "disconnected",
  "message": "Unable to connect to CrowdSec LAPI",
  "lastSuccessfulSync": "2026-02-13T10:25:30.123Z",
  "timestamp": "2026-02-13T10:30:45.123Z"
}
```

**Notes:**
- Performs lightweight check using existing authentication token
- Requests alerts from last minute (`since=1m`) to verify LAPI is responsive
- Response body may be empty if no recent alerts, but 200 status confirms connectivity
- `lastSuccessfulSync` is `null` if no successful sync has occurred yet

---

## Alerts Endpoints

### GET `/api/v1/alerts`

Retrieve all alerts with optional filtering and pagination.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 100 | Number of items to return (must be positive) |
| `offset` | integer | No | 0 | Starting index (must be non-negative) |
| `unpaged` | boolean | No | false | Disable pagination and return all results |
| `scenario` | string | No | - | Filter by scenario name (partial match) |
| `simulated` | boolean | No | - | Filter by simulated status |

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/alerts?limit=10&scenario=ssh-bf"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "abc-123-def",
      "crowdsec_alert_id": 12345,
      "scenario": "crowdsecurity/ssh-bf",
      "scenario_version": "0.1",
      "scenario_hash": "abc123",
      "message": "Ip 192.168.1.100 performed ssh-bf attack",
      "capacity": 5,
      "leakspeed": "10s",
      "simulated": false,
      "remediation": true,
      "events_count": 6,
      "machine_id": "machine-123",
      "source": {
        "ip": "192.168.1.100",
        "scope": "Ip",
        "cn": "US",
        "as_name": "ISP Name",
        "as_number": "12345",
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "labels": ["manual"],
      "meta": [],
      "events": [],
      "crowdsec_created_at": "2026-02-13T10:20:30.123Z",
      "start_at": "2026-02-13T10:15:00.000Z",
      "stop_at": "2026-02-13T10:20:30.000Z",
      "created_at": "2026-02-13T10:25:30.123Z",
      "updated_at": "2026-02-13T10:25:30.123Z"
    }
  ],
  "pagination": {
    "page": 1,
    "amount": 10,
    "total": 150
  }
}
```

**Validation:**
- All parameters are validated using express-validator
- Invalid values return 400 Bad Request with detailed error messages
- `offset` cannot be greater than total items

---

### GET `/api/v1/alerts/:id`

Retrieve a specific alert by ID.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Alert ID |

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/alerts/1"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
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
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Alert not found"
}
```

---

### GET `/api/v1/alerts/stats`

Get aggregated statistics about alerts.

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/alerts/stats"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "simulated": 25,
    "real": 125,
    "topScenarios": [
      {
        "scenario": "crowdsecurity/ssh-bf",
        "count": 45
      },
      {
        "scenario": "crowdsecurity/http-probing",
        "count": 30
      }
    ]
  }
}
```

---

## Decisions Endpoints

### GET `/api/v1/decisions`

Retrieve all decisions with optional filtering and pagination.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 100 | Number of items to return (must be positive) |
| `offset` | integer | No | 0 | Starting index (must be non-negative) |
| `unpaged` | boolean | No | false | Disable pagination and return all results |
| `type` | string | No | - | Filter by decision type (ban, captcha, etc.) |
| `scope` | string | No | - | Filter by scope (Ip, Range, etc.) |
| `value` | string | No | - | Filter by value (IP address, range, etc.) |
| `simulated` | boolean | No | - | Filter by simulated status |

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/decisions?type=ban&limit=20"
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
      "origin": "cscli",
      "type": "ban",
      "scope": "Ip",
      "value": "192.168.1.100",
      "duration": "4h",
      "scenario": "crowdsecurity/ssh-bf",
      "simulated": false,
      "created_at": "2026-02-13T10:25:30.123Z",
      "updated_at": "2026-02-13T10:25:30.123Z"
    }
  ],
  "pagination": {
    "page": 1,
    "amount": 20,
    "total": 75
  }
}
```

**Validation:**
- All parameters are validated using express-validator
- Invalid values return 400 Bad Request with detailed error messages
- `offset` cannot be greater than total items

---

### GET `/api/v1/decisions/:id`

Retrieve a specific decision by ID.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Decision ID |

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/decisions/1"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
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
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Decision not found"
}
```

---

### GET `/api/v1/decisions/active`

Get recent decisions (last 100).

**Note:** Since CrowdSec only provides duration as a string (e.g., "4h", "1d"), we cannot accurately determine if a decision is still active without parsing it. This endpoint returns the last 100 decisions ordered by creation date.

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/decisions/active"
```

**Example Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 100,
  "note": "Returns recent decisions. Active status cannot be determined without parsing duration strings."
}
```

---

### GET `/api/v1/decisions/stats`

Get aggregated statistics about decisions.

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/decisions/stats"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "total": 75,
    "byType": [
      {
        "type": "ban",
        "count": 65
      },
      {
        "type": "captcha",
        "count": 10
      }
    ],
    "byScope": [
      {
        "scope": "Ip",
        "count": 70
      },
      {
        "scope": "Range",
        "count": 5
      }
    ]
  }
}
```

---

## Response Format

All API responses follow a consistent structure.

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "amount": 10,
    "total": 100
  }
}
```

**Pagination Object (when paginated):**
- `page`: Current page number (calculated from offset/limit)
- `amount`: Number of items in current response
- `total`: Total number of items available

**Without pagination (unpaged=true):**
```json
{
  "success": true,
  "data": [...],
  "total": 100
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `500`: Internal Server Error
- `503`: Service Unavailable (LAPI connection issues)

---

## Validation Errors

When query parameters fail validation, the API returns a 400 Bad Request with detailed error information:

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "limit",
      "message": "limit must be a positive integer"
    },
    {
      "field": "offset",
      "message": "offset must be a non-negative integer"
    }
  ]
}
```

---

## Rate Limiting

The API is protected by rate limiting:
- **Limit**: 100 requests per 15 minutes per IP address
- **Scope**: Applied to all `/api/v1/*` endpoints

When rate limit is exceeded:
```json
{
  "message": "Too many requests from this IP, please try again later."
}
```
