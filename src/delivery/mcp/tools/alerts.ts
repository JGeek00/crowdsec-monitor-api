import { z } from 'zod';
import { container } from '@/container';
import { runTool, type McpToolDefinition } from '../tool';

const stringOrStringArray = z.union([z.string(), z.array(z.string())]).optional();

/**
 * Alerts tools (S2): the full REST alerts surface.
 * Each tool calls the same use case as its HTTP controller.
 */
export const alertTools: McpToolDefinition[] = [
  {
    name: 'list_alerts',
    description: 'List alerts with filtering and pagination (scenario, simulated, IP, country, IP owner, target).',
    inputSchema: {
      limit: z.number().int().positive().optional().describe('Items to return (default 100)'),
      offset: z.number().int().nonnegative().optional().describe('Starting index (default 0)'),
      unpaged: z.boolean().optional().describe('Disable pagination and return all results'),
      scenario: stringOrStringArray.describe('Filter by scenario name (partial match)'),
      simulated: z.union([z.boolean(), z.string()]).optional().describe('Filter by simulated status'),
      ip_address: stringOrStringArray.describe('Filter by source IP address'),
      country: stringOrStringArray.describe('Filter by source country (2-letter ISO code)'),
      ip_owner: stringOrStringArray.describe('Filter by IP owner/organization name (partial match)'),
      target: stringOrStringArray.describe('Filter by target FQDN'),
    },
    handler: (args) =>
      runTool(async () => {
        const query = args as Parameters<typeof container.useCases.alerts.listAlerts.execute>[0];
        const { limit = 100, offset = 0, unpaged = false } = query;
        const page = await container.useCases.alerts.listAlerts.execute(query);
        if (!unpaged && Number(offset) > page.total) {
          throw new Error(`Invalid parameter: offset (${offset}) cannot be greater than total items (${page.total})`);
        }
        return unpaged
          ? { filtering: page.filtering, items: page.items, total: page.total }
          : {
              filtering: page.filtering,
              items: page.items,
              pagination: {
                page: Math.floor(Number(offset) / Number(limit)) + 1,
                amount: page.items.length,
                total: page.total,
              },
            };
      }),
  },
  {
    name: 'get_alert',
    description: 'Get an alert by ID with its associated decisions.',
    inputSchema: {
      id: z.number().int().positive().describe('Alert ID'),
    },
    handler: (args) =>
      runTool(async () => {
        const { id } = args as { id: number };
        const result = await container.useCases.alerts.getAlert.execute(id);
        return { ...result.alert, decisions: result.decisions };
      }),
  },
  {
    name: 'get_alerts_stats',
    description:
      'Get aggregated statistics about alerts (total, simulated/real, top scenarios/countries/organizations).',
    handler: () => runTool(() => container.useCases.alerts.getAlertsStats.execute()),
  },
  {
    name: 'delete_alert',
    description: 'Delete an alert by ID from CrowdSec LAPI (including all associated decisions) and re-sync.',
    inputSchema: {
      id: z.number().int().positive().describe('Alert ID'),
    },
    handler: (args) =>
      runTool(async () => {
        const { id } = args as { id: number };
        const { nbDeleted } = await container.useCases.alerts.deleteAlert.execute(id);
        return { message: 'Alert deleted successfully', nbDeleted: nbDeleted.toString() };
      }),
  },
];
