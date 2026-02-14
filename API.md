# API Documentation

Complete API reference for CrowdSec Monitor API endpoints.

## Base URL

All endpoints are prefixed with `/api/v1`

```
http://localhost:3000/api/v1
```

## Authentication

### Optional Bearer Token Authentication

API authentication is **optional** and controlled by the `API_PASSWORD` environment variable:

- **If `API_PASSWORD` is not set**: All endpoints are accessible without authentication
- **If `API_PASSWORD` is set**: Alerts and Decisions endpoints require Bearer token authentication

**Authenticated Request Example:**
```bash
curl -H "Authorization: Bearer your_password_here" \
  http://localhost:3000/api/v1/alerts
```

**Authentication Errors:**

**401 Unauthorized - Missing Authorization Header:**
```json
{
  "error": "Unauthorized",
  "message": "Authorization header is required"
}
```

**401 Unauthorized - Invalid Format:**
```json
{
  "error": "Unauthorized",
  "message": "Authorization header must be in format: Bearer <token>"
}
```

**401 Unauthorized - Invalid Credentials:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid credentials"
}
```

**Protected Endpoints:**
- All `/alerts/*` endpoints (when `API_PASSWORD` is set)
- All `/decisions/*` endpoints (when `API_PASSWORD` is set)
- `/lapi-status` endpoint (when `API_PASSWORD` is set)

**Public Endpoints:**
- `/api-health` (always accessible without authentication)

**Note:** The `/api-health` endpoint is always public for basic availability checks. The `/lapi-status` endpoint requires authentication when `API_PASSWORD` is configured.

**Backend Communication:** All endpoints communicate with CrowdSec LAPI using Watcher credentials configured via environment variables.

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

**Authentication:** Required if `API_PASSWORD` is set

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
      "id": 12345,
      "uuid": "abc-123-def",
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

### DELETE `/api/v1/alerts/:id`

Delete an alert by ID from CrowdSec LAPI.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Alert ID to delete |

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/alerts/123"
```

**Success Response (200 OK):**
```json
{
  "message": "Alert deleted successfully",
  "nbDeleted": "1"
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Invalid alert ID",
  "message": "Alert ID must be a valid number"
}
```

**404 Not Found:**
```json
{
  "error": "Alert not found",
  "message": "Alert with ID 123 was not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to delete alert",
  "message": "Error details..."
}
```

**Notes:**
- The alert is deleted from CrowdSec LAPI (including all associated decisions)
- Immediately deleted from the local database after successful deletion from LAPI
- After deletion, the API automatically syncs the local database with LAPI
- The local database is updated to reflect the current state in LAPI

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
| `only_active` | boolean | No | false | Filter only active decisions (expiration date is in the future) |
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

# Get only active decisions (not expired)
curl "http://localhost:3000/api/v1/decisions?only_active=true"

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
curl "http://localhost:3000/api/v1/decisions?ip_owner=Digital%20Ocean&type=ban&only_active=true"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": 98765,
      "alert_id": 1,
      "origin": "cscli",
      "type": "ban",
      "scope": "Ip",
      "value": "192.168.1.100",
      "expiration": "2026-02-13T14:25:30.123Z",
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

### POST `/api/v1/decisions`

Create a decision in CrowdSec LAPI. This is a simplified endpoint that creates an alert with a decision.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ip` | string | Yes | IPv4 or IPv6 address to apply the decision to |
| `duration` | string | Yes | Duration in CrowdSec format (e.g., 2m, 10h, 1d, 3w) |
| `reason` | string | Yes | Human-readable reason for the decision (letters, numbers, spaces, dots, commas) |
| `type` | string | Yes | Decision type: `ban`, `captcha`, `throttle`, or `allow` |

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/v1/decisions" \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.100.200",
    "duration": "1h",
    "reason": "Manual ban from API",
    "type": "ban"
  }'
```

**Example Response (201 Created):**
```json
{
  "message": "Decision created successfully",
  "alert_ids": ["12345"],
  "decision": {
    "ip": "192.168.100.200",
    "type": "ban",
    "duration": "1h",
    "reason": "Manual ban from API"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "msg": "ip must be a valid IPv4 or IPv6 address",
      "param": "ip",
      "location": "body"
    }
  ]
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "message": "Error creating decision",
  "error": "Connection refused"
}
```

**Notes:**
- The endpoint creates a complete alert structure in CrowdSec LAPI with the decision
- Uses scenario `manual/crowdsec-monitor` for alerts created via API
- The `origin` field is set to the configured `CROWDSEC_USER` environment variable
- Returns the alert ID(s) created in LAPI
- All validations are performed before forwarding to LAPI
- After successful creation, the API automatically syncs the local database with LAPI
- The local database is updated to reflect the current state in LAPI

**Duration Format:**
Accepts CrowdSec duration format with units:
- `s` - seconds (e.g., `30s`)
- `m` - minutes (e.g., `5m`)
- `h` - hours (e.g., `2h`)
- `d` - days (e.g., `1d`)
- `w` - weeks (e.g., `3w`)

**Decision Types:**
- `ban` - Block the IP completely
- `captcha` - Challenge with a CAPTCHA
- `throttle` - Rate limit the IP
- `allow` - Explicitly allow the IP

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
  "id": 98765,
  "alert_id": 1,
  "type": "ban",
  "scope": "Ip",
  "value": "192.168.1.100",
  "expiration": "2026-02-13T14:25:30.123Z",
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

### DELETE `/api/v1/decisions/:id`

Delete a decision by ID from CrowdSec LAPI.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Decision ID to delete |

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/decisions/456"
```

**Success Response (200 OK):**
```json
{
  "message": "Decision deleted successfully",
  "nbDeleted": "1"
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Invalid decision ID",
  "message": "Decision ID must be a valid number"
}
```

**404 Not Found:**
```json
{
  "error": "Decision not found",
  "message": "Decision with ID 456 was not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to delete decision",
  "message": "Error details..."
}
```

**Notes:**
- The decision is deleted from CrowdSec LAPI
- The associated alert is NOT deleted, only the decision
- In the local database, the decision expiration date is set to the current time (not deleted)
- After deletion, the API automatically syncs the local database with LAPI
- The local database is updated to reflect the current state in LAPI

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

The API supports optional rate limiting via the `RATE_LIMIT` environment variable:
- **Format**: `<requests>/<minutes>` (e.g., `100/15` for 100 requests per 15 minutes)
- **Scope**: Applied to all `/api/v1/*` endpoints when enabled
- **Default**: Disabled if `RATE_LIMIT` is not set

When rate limit is exceeded:
```json
{
  "message": "Too many requests from this IP, please try again later."
}
```
