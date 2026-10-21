import type { McpTool } from '../server';

// TODO(mcp): implement calling container.useCases.blocklists.createBlocklist.
export const createBlocklistTool: McpTool = {
  name: 'create_blocklist',
  description: 'Create a managed blocklist (calls the CreateBlocklist use case).',
  handler: async () => {
    throw new Error('TODO(mcp): not implemented — MCP SDK pending approval');
  },
};
