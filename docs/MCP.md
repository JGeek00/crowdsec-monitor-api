# MCP Server

The API exposes a [Model Context Protocol](https://modelcontextprotocol.io/) server so AI assistants can query and manage CrowdSec through the same application core as the REST API.

## Endpoint

```
POST /mcp
```

- Transport: **Streamable HTTP, stateless mode** (no session IDs; every request is independent).
- `GET` and `DELETE` on this path answer `405 Method Not Allowed`.
- Results are returned as JSON-encoded text content, mirroring the REST response bodies documented in [API.md](./API.md).
- Unknown ids/names are returned as `isError` tool results (`{"error": "Not found", ...}`); invalid arguments are rejected by input validation with an `isError` result naming the tool.

## Authentication

Same rule as the REST API:

- If `API_PASSWORD` is **not set**, the endpoint is open.
- If `API_PASSWORD` is **set**, every request must carry `Authorization: Bearer <API_PASSWORD>` (constant-time comparison, same `AuthMiddleware` as REST).

Example:

```bash
curl -X POST http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Authorization: Bearer your_password_here' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Tools

| Tool | REST equivalent |
|------|-----------------|
| `get_statistics` (`since?`, `amount?`) | `GET /statistics` |
| `get_top_countries` | `GET /statistics/countries` |
| `get_country_history` (`country`) | `GET /statistics/countries/:item` |
| `get_top_ip_owners` | `GET /statistics/ip-owners` |
| `get_ip_owner_history` (`ip_owner`) | `GET /statistics/ip-owners/:item` |
| `get_top_scenarios` | `GET /statistics/scenarios` |
| `get_scenario_history` (`scenario`) | `GET /statistics/scenarios/:item` |
| `get_top_targets` | `GET /statistics/targets` |
| `get_target_history` (`target`) | `GET /statistics/targets/:item` |
| `list_alerts` (filters + pagination, `start_timestamp?`, `end_timestamp?`) | `GET /alerts` |
| `get_alert` (`id`) | `GET /alerts/:id` |
| `get_alerts_stats` | `GET /alerts/stats` |
| `delete_alert` (`id`) | `DELETE /alerts/:id` |
| `list_decisions` (filters + pagination, `start_timestamp?`, `end_timestamp?`) | `GET /decisions` |
| `get_decision` (`id`) | `GET /decisions/:id` |
| `list_decisions_by_ip` (`include_decisions?`, …) | `GET /decisions/by-ip` |
| `get_decision_by_ip` (`ip`, `only_active?`) | `GET /decisions/by-ip/:ip` |
| `get_decisions_stats` | `GET /decisions/stats` |
| `create_decision` (`ip`, `duration`, `reason`, `type`) | `POST /decisions` |
| `delete_decision` (`id`) | `DELETE /decisions/:id` |
| `list_blocklists` (pagination, `include_ips?`, `get_only?`) | `GET /blocklists` |
| `get_blocklist` (`id`, `include_ips?`) | `GET /blocklists/:id` |
| `get_blocklist_ips` (`id`, pagination, `ip_string?`) | `GET /blocklists/:id/ips` |
| `list_allowlists` | `GET /allowlists` |
| `get_allowlist` (`allowlist_name`) | `GET /allowlists/:allowlist_name` |
| `check_ip_in_lists` (`ip`) | `POST /lists/check-ips` (single IP; returns `{ip, blocklists, allowlists}`) |

Notifications are intentionally **not** exposed. Blocklist/allowlist writes (create, delete, toggle, refresh) and `check-domain` are intentionally **not** exposed.

## MCP client configuration

Point any Streamable-HTTP-compatible MCP client at `http://<host>:3000/mcp` and, when `API_PASSWORD` is set, configure the `Authorization: Bearer …` header.
