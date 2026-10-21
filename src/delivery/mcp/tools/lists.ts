import { z } from 'zod';
import { container } from '@/container';
import { ipv6Regex } from '@/constants/regexps';
import { isIpv4 } from '@/shared/utils/ip';
import { runTool, type McpToolDefinition } from '../tool';

/**
 * Lists tools (S4): read-only list/detail coverage of blocklists and allowlists.
 * No create/delete/toggle/refresh/check tools are exposed.
 * Each tool calls the same use case as its HTTP controller.
 */
export const listTools: McpToolDefinition[] = [
  {
    name: 'list_blocklists',
    description: 'List managed blocklists (API-managed first, then CrowdSec-managed) with pagination.',
    inputSchema: {
      limit: z.number().int().positive().optional().describe('Items to return (default 100)'),
      offset: z.number().int().nonnegative().optional().describe('Starting index (default 0)'),
      unpaged: z.boolean().optional().describe('Return all results without pagination'),
      include_ips: z
        .enum(['full', 'ip_string'])
        .optional()
        .describe('full: include IPs as objects; ip_string: include IPs as plain strings'),
      get_only: z
        .enum(['blocklists', 'cs_blocklists'])
        .optional()
        .describe('blocklists: only API-managed; cs_blocklists: only CrowdSec-managed'),
    },
    handler: (args) =>
      runTool(() =>
        container.useCases.blocklists.listBlocklists.execute(
          args as Parameters<typeof container.useCases.blocklists.listBlocklists.execute>[0],
        ),
      ),
  },
  {
    name: 'get_blocklist',
    description: 'Get a specific blocklist by ID (looks up API-managed first, then CrowdSec-managed).',
    inputSchema: {
      id: z.string().describe('Blocklist ID'),
      include_ips: z
        .enum(['full', 'ip_string'])
        .optional()
        .describe('full: include IPs as objects; ip_string: include IPs as plain strings'),
    },
    handler: (args) =>
      runTool(async () => {
        const { id, include_ips } = args as { id: string; include_ips?: string };
        const includeIps = include_ips === 'full' || include_ips === 'ip_string';
        const onlyIps = include_ips === 'ip_string';
        const item = await container.useCases.blocklists.getBlocklist.execute(id, includeIps, onlyIps);
        return { data: item };
      }),
  },
  {
    name: 'get_blocklist_ips',
    description: 'Get paginated IPs for a specific blocklist (API-managed or CrowdSec-managed).',
    inputSchema: {
      id: z.string().describe('Blocklist ID'),
      limit: z.number().int().positive().optional().describe('Results per page (default 50)'),
      offset: z.number().int().nonnegative().optional().describe('Pagination offset (default 0)'),
      unpaged: z.boolean().optional().describe('Return all results without pagination'),
      ip_string: z.boolean().optional().describe('Return plain IP strings instead of full objects'),
    },
    handler: (args) =>
      runTool(() => {
        const {
          id,
          limit = 50,
          offset = 0,
          unpaged = false,
          ip_string = false,
        } = args as {
          id: string;
          limit?: number;
          offset?: number;
          unpaged?: boolean;
          ip_string?: boolean;
        };
        return container.useCases.blocklists.getBlocklistIps.execute(id, {
          limit,
          offset,
          unpaged,
          onlyStrings: ip_string,
        });
      }),
  },
  {
    name: 'list_allowlists',
    description: 'List all allowlists from CrowdSec LAPI.',
    handler: () => runTool(() => container.useCases.blocklists.listAllowlists.execute()),
  },
  {
    name: 'check_ip_in_lists',
    description: 'Check whether a single IPv4/IPv6 address is in any blocklist or allowlist.',
    inputSchema: {
      ip: z
        .string()
        .refine((value) => isIpv4(value) || ipv6Regex.test(value), {
          message: 'ip must be a valid IPv4 or IPv6 address',
        })
        .describe('IPv4 or IPv6 address to check'),
    },
    handler: (args) =>
      runTool(async () => {
        const { ip } = args as { ip: string };
        const { results } = await container.useCases.blocklists.checkIpsInList.execute([ip]);
        return results[0];
      }),
  },
  {
    name: 'get_allowlist',
    description: 'Get a specific allowlist by name from CrowdSec LAPI.',
    inputSchema: {
      allowlist_name: z.string().describe('Allowlist name'),
    },
    handler: (args) =>
      runTool(() => {
        const { allowlist_name } = args as { allowlist_name: string };
        return container.useCases.blocklists.getAllowlist.execute(allowlist_name);
      }),
  },
];
