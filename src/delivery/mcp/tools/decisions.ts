import { z } from 'zod';
import { container } from '@/container';
import { ipv4Regex, ipv6Regex } from '@/constants/regexps';
import { runTool, type McpToolDefinition } from '../tool';
import { TIMESTAMP_RANGE_PATTERN, TIMESTAMP_RANGE_FORMAT } from '@/shared/utils/timestamp-range';

const stringOrStringArray = z.union([z.string(), z.array(z.string())]).optional();

const decisionsFilters = {
  limit: z.number().int().positive().optional().describe('Items to return (default 100)'),
  offset: z.number().int().nonnegative().optional().describe('Starting index (default 0)'),
  unpaged: z.boolean().optional().describe('Disable pagination and return all results'),
  type: z.string().optional().describe('Filter by decision type (ban, captcha, throttle, allow)'),
  scope: z.string().optional().describe('Filter by scope (ip, range)'),
  value: z.string().optional().describe('Filter by value'),
  simulated: z.union([z.boolean(), z.string()]).optional().describe('Filter by simulated status'),
  scenario: stringOrStringArray.describe('Filter by scenario name'),
  ip_address: stringOrStringArray.describe('Filter by IP address'),
  country: stringOrStringArray.describe('Filter by country (2-letter ISO code)'),
  ip_owner: stringOrStringArray.describe('Filter by IP owner/organization name'),
  only_active: z.boolean().optional().describe('Only active decisions (expiration in the future)'),
};

/** Optional UTC timestamp range bound (`yyyy-MM-dd:hh:mm:ss`); semantic validation lives in the list use case. */
const timestampRangeFields = {
  start_timestamp: z
    .string()
    .regex(TIMESTAMP_RANGE_PATTERN, `must follow the format ${TIMESTAMP_RANGE_FORMAT} in UTC`)
    .optional()
    .describe(
      `Inclusive lower bound for the creation timestamp. Always interpreted as UTC. Format: ${TIMESTAMP_RANGE_FORMAT}`,
    ),
  end_timestamp: z
    .string()
    .regex(TIMESTAMP_RANGE_PATTERN, `must follow the format ${TIMESTAMP_RANGE_FORMAT} in UTC`)
    .optional()
    .describe(
      `Inclusive upper bound for the creation timestamp. Must be later than start_timestamp and not in the future. Always interpreted as UTC. Format: ${TIMESTAMP_RANGE_FORMAT}`,
    ),
};

/**
 * Decisions tools (S3): the full REST decisions surface.
 * Each tool calls the same use case as its HTTP controller.
 */
export const decisionTools: McpToolDefinition[] = [
  {
    name: 'list_decisions',
    description: 'List decisions with filtering and pagination (timestamp range optional).',
    inputSchema: { ...decisionsFilters, ...timestampRangeFields },
    handler: (args) =>
      runTool(() =>
        container.useCases.decisions.listDecisions.execute(
          args as Parameters<typeof container.useCases.decisions.listDecisions.execute>[0],
        ),
      ),
  },
  {
    name: 'get_decision',
    description: 'Get a decision by ID with its associated alert.',
    inputSchema: {
      id: z.number().int().positive().describe('Decision ID'),
    },
    handler: (args) =>
      runTool(() => {
        const { id } = args as { id: number };
        return container.useCases.decisions.getDecision.execute(id);
      }),
  },
  {
    name: 'list_decisions_by_ip',
    description:
      'List decisions grouped by IP with filtering and pagination. Returns groups with counts by default; set include_decisions for full decision objects with alert detail.',
    inputSchema: {
      ...decisionsFilters,
      include_decisions: z.boolean().optional().describe('Include full decision objects in each group'),
    },
    handler: (args) =>
      runTool(() =>
        container.useCases.decisions.listDecisionsByIp.execute(
          args as Parameters<typeof container.useCases.decisions.listDecisionsByIp.execute>[0],
        ),
      ),
  },
  {
    name: 'get_decision_by_ip',
    description: 'Get common info plus all decisions for a single IP address.',
    inputSchema: {
      ip: z
        .string()
        .refine((value) => ipv4Regex.test(value) || ipv6Regex.test(value), {
          message: 'ip must be a valid IPv4 or IPv6 address',
        })
        .describe('IP address'),
      only_active: z.boolean().optional().describe('Only active decisions (expiration in the future)'),
    },
    handler: (args) =>
      runTool(() => {
        const { ip, only_active } = args as { ip: string; only_active?: boolean };
        return container.useCases.decisions.getDecisionByIp.execute(ip, only_active === true);
      }),
  },
  {
    name: 'get_decisions_stats',
    description: 'Get aggregated statistics about decisions (total, by type, by scope).',
    handler: () => runTool(() => container.useCases.decisions.getDecisionsStats.execute()),
  },
  {
    name: 'create_decision',
    description:
      'Create a decision in CrowdSec LAPI for an IP (creates a manual alert carrying the decision) and re-sync.',
    inputSchema: {
      ip: z
        .string()
        .refine((value) => ipv4Regex.test(value) || ipv6Regex.test(value), {
          message: 'ip must be a valid IPv4 or IPv6 address',
        })
        .describe('IP address to decide on'),
      duration: z
        .string()
        .regex(
          /^(-?\d+(\.\d+)?(d|h|m))+$/,
          'duration must be in format: days(d), hours(h), minutes(m) (e.g. 15m, 4h, 1d, 1d4h15m)',
        )
        .describe('Decision duration, e.g. "4h"'),
      reason: z
        .string()
        .regex(/^[a-zA-Z0-9., ]+$/, 'reason must contain only letters, numbers, spaces, dots and commas')
        .describe('Reason for the decision'),
      type: z.enum(['ban', 'captcha', 'throttle', 'allow']).describe('Decision type'),
    },
    handler: (args) =>
      runTool(() =>
        container.useCases.decisions.createDecision.execute(
          args as Parameters<typeof container.useCases.decisions.createDecision.execute>[0],
        ),
      ),
  },
  {
    name: 'delete_decision',
    description: 'Delete a decision by ID from CrowdSec LAPI (marks it expired locally) and re-sync.',
    inputSchema: {
      id: z.number().int().positive().describe('Decision ID'),
    },
    handler: (args) =>
      runTool(async () => {
        const { id } = args as { id: number };
        const { nbDeleted } = await container.useCases.decisions.deleteDecision.execute(id);
        return { message: 'DecisionsTable deleted successfully', nbDeleted: nbDeleted.toString() };
      }),
  },
];
