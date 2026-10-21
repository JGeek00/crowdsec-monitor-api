import type { McpToolDefinition } from '../tool';
import { statisticsTools } from './statistics';
import { alertTools } from './alerts';
import { decisionTools } from './decisions';
import { listTools } from './lists';

/**
 * Ordered registry of every MCP tool the server exposes.
 *
 * Tools call the same application use cases as the HTTP/WS layers (D11).
 * Notifications are intentionally absent (S5: "notifications: nada").
 */
export const mcpToolRegistry: McpToolDefinition[] = [...statisticsTools, ...alertTools, ...decisionTools, ...listTools];
