import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import packageJson from '../../../package.json';
import { log } from '@/infrastructure/system/logger';
import type { McpToolDefinition } from './tool';
import { mcpToolRegistry } from './tools/registry';

/**
 * MCP server factory (delivery/mcp).
 *
 * Creates an `McpServer` with every registered tool wired to the same
 * application use cases the HTTP/WS layers call (D11). One server instance
 * is built per Streamable HTTP request (stateless mode); see `../http.ts`.
 */
export const createMcpServer = (tools: McpToolDefinition[] = mcpToolRegistry): McpServer => {
  const server = new McpServer({
    name: 'crowdsec-monitor',
    version: packageJson.version,
  });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        ...(tool.inputSchema !== undefined ? { inputSchema: tool.inputSchema } : {}),
      },
      async (args: unknown) => {
        try {
          const result = await tool.handler(args);
          log.info(`[mcp] tool: '${tool.name}'${result.isError ? ' (error)' : ''}`);
          return result;
        } catch (err: unknown) {
          log.error(`[mcp] tool: '${tool.name}' (internal error)`);
          throw err;
        }
      },
    );
  }

  return server;
};
