import type { McpTool } from '../server';

// TODO(mcp): implement calling container.useCases.status.getStatus.
export const getStatusTool: McpTool = {
  name: 'get_status',
  description: 'Get the monitor status snapshot (calls the GetStatus use case).',
  handler: async () => {
    throw new Error('TODO(mcp): not implemented — MCP SDK pending approval');
  },
};
