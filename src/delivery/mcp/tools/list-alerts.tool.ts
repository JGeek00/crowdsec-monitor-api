import type { McpTool } from '../server';

// TODO(mcp): implement calling container.useCases.alerts.listAlerts.
export const listAlertsTool: McpTool = {
  name: 'list_alerts',
  description: 'List CrowdSec alerts with filters (calls the ListAlerts use case).',
  handler: async () => {
    throw new Error('TODO(mcp): not implemented — MCP SDK pending approval');
  },
};
