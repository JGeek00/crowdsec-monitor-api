/**
 * MCP (Model Context Protocol) server stub.
 *
 * The MCP surface is planned (S1) but not approved for implementation yet.
 * This stub only establishes the folder structure and the dependency
 * direction: MCP tools must call the same application use cases as the HTTP
 * and WebSocket delivery layers (D11). Each tool file carries a TODO(mcp)
 * marker until the MCP SDK is approved.
 */

// TODO(mcp): wire the MCP server transport once the SDK is approved.
export interface McpTool {
  name: string;
  description: string;
  handler: (input: unknown) => Promise<unknown>;
}

export const registerMcpTools = (tools: McpTool[]): McpTool[] => tools;

export const mcpServerStub = {
  status: 'stub',
  note: 'MCP delivery layer pending SDK approval (D11). Tools call application use cases.',
};
