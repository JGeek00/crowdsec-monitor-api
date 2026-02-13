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
  "status": "connected",
  "message": "CrowdSec LAPI is reachable and authenticated",
  "lastSuccessfulSync": "2026-02-13T10:25:30.123Z",
  "timestamp": "2026-02-13T10:30:45.123Z"
}
```

**Response (Disconnected):**
```json
{
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
| `scenario` | string/array | No | - | Filter by scenario name (partial match). Accepts single or multiple values |
| `simulated` | boolean | No | - | Filter by simulated status |
| `ip_address` | string/array | No | - | Filter by source IP address. Accepts single or multiple IPv4/IPv6 addresses |
| `country` | string/array | No | - | Filter by source country (2-letter ISO code). Accepts single or multiple values |
| `ip_owner` | string/array | No | - | Filter by IP owner/organization name (partial match). Accepts single or multiple values |

**Example Request:**
```bash
# Single filters
curl "http://localhost:3000/api/v1/alerts?limit=10&scenario=ssh-bf"

# Multiple scenarios
curl "http://localhost:3000/api/v1/alerts?scenario=ssh-bf&scenario=http-probing"

# Filter by IP addresses
curl "http://localhost:3000/api/v1/alerts?ip_address=192.168.1.100&ip_address=10.0.0.1"

# Filter by countries
curl "http://localhost:3000/api/v1/alerts?country=US&country=CN"

# Filter by IP owner/organization
curl "http://localhost:3000/api/v1/alerts?ip_owner=Amazon"
curl "http://localhost:3000/api/v1/alerts?ip_owner=Amazon&ip_owner=Google"

# Combined filters
curl "http://localhost:3000/api/v1/alerts?country=RU&scenario=ssh-bf&limit=20"
curl "http://localhost:3000/api/v1/alerts?ip_owner=Digital%20Ocean&country=US"
```

**Example Response:**
```json
{
  "items": [
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
```

**Error Response (404):**
```json
{
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
  ],
  "topCountries": [
    {
      "country": "CN",
      "count": 35
    },
    {
      "country": "US",
      "count": 28
    },
    {
      "country": "RU",
      "count": 22
    }
  ],
  "topOrganizations": [
    {
      "organization": "Alibaba Cloud",
      "count": 18
    },
    {
      "organization": "Amazon Web Services",
      "count": 15
    },
    {
      "organization": "Digital Ocean",
      "count": 12
    }
  ]
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
| `scenario` | string/array | No | - | Filter by scenario name (partial match). Accepts single or multiple values |
| `ip_address` | string/array | No | - | Filter by IP address in decision value. Accepts single or multiple IPv4/IPv6 addresses |
| `country` | string/array | No | - | Filter by country from related alert (2-letter ISO code). Accepts single or multiple values |
| `ip_owner` | string/array | No | - | Filter by IP owner/organization from related alert (partial match). Accepts single or multiple values |

**Example Request:**
```bash
# Single filters
curl "http://localhost:3000/api/v1/decisions?type=ban&limit=20"

# Multiple scenarios
curl "http://localhost:3000/api/v1/decisions?scenario=ssh-bf&scenario=http-probing"

# Filter by IP addresses
curl "http://localhost:3000/api/v1/decisions?ip_address=192.168.1.100"

# Filter by countries (from related alert)
curl "http://localhost:3000/api/v1/decisions?country=CN&type=ban"

# Filter by IP owner/organization (from related alert)
curl "http://localhost:3000/api/v1/decisions?ip_owner=Amazon"
curl "http://localhost:3000/api/v1/decisions?ip_owner=Alibaba&ip_owner=Tencent"

# Combined filters
curl "http://localhost:3000/api/v1/decisions?scenario=ssh-bf&country=RU&limit=10"
curl "http://localhost:3000/api/v1/decisions?ip_owner=Digital%20Ocean&type=ban"
```

**Example Response:**
```json
{
  "items": [
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
```

**Error Response (404):**
```json
{
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
  "items": [...],
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
```

---

## Response Format

All API responses follow a consistent structure.

### Success Response (List Endpoints)

For endpoints that return lists (e.g., `/alerts`, `/decisions`):

```json
{
  "items": [...],
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
  "items": [...],
  "total": 100
}
```

### Success Response (Single Item)

For endpoints that return a single resource (e.g., `/alerts/:id`, `/decisions/:id`):

```json
{
  "id": 1,
  "field1": "value1",
  "field2": "value2"
}
```

The resource data is returned directly at the root level.

### Success Response (Stats/Aggregations)

For endpoints that return statistics or aggregations:

```json
{
  "total": 100,
  "field1": [...],
  "field2": [...]
}
```

Statistics are returned directly at the root level.

### Error Response

```json
{
  "message": "Error description",
  "error": "Detailed error message (only in development mode)"
}
```

**Notes:**
- The `error` field with detailed error information is only included when `NODE_ENV !== 'production'`
- In production mode, only generic error messages are returned for security reasons

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `500`: Internal Server Error
- `503`: Service Unavailable (LAPI connection issues)

---

## Validation Errors

When query parameters fail validation, the API returns a 400 Bad Request with detailed error information:

**Example validation error:**
```json
{
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

**Common validation errors for new parameters:**
```json
{
  "message": "Validation error",
  "errors": [
    {
      "field": "ip_address",
      "message": "ip_address must be a valid IPv4 or IPv6 address"
    },
    {
      "field": "country",
      "message": "country must be a 2-letter country code (ISO 3166-1 alpha-2)"
    }
  ]
}
```

**Examples of invalid values:**
- `ip_address=999.999.999.999` → Invalid IPv4 format
- `ip_address=invalid` → Not a valid IP address
- `country=USA` → Must be 2 letters (use `US`)
- `country=X` → Must be exactly 2 letters

**Note:** 
- Validation errors always include detailed information as they are client-side errors, not security-sensitive server errors
- The `scenario` and `ip_owner` parameters accept any string and are not validated for format
- `ip_address`, `country`, `scenario`, and `ip_owner` parameters accept both single values and arrays
- `ip_owner` performs partial match (case-insensitive) on the organization/AS name field

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
