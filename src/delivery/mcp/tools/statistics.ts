import { z } from 'zod';
import { container } from '@/container';
import { runTool, type McpToolDefinition } from '../tool';

/**
 * Statistics tools (S1): the full REST statistics surface.
 * Each tool calls the same use case as its HTTP controller.
 */
export const statisticsTools: McpToolDefinition[] = [
  {
    name: 'get_statistics',
    description:
      'Get comprehensive statistics: alerts in the last 24h, active decisions, activity history and top countries/scenarios/IP owners/targets.',
    inputSchema: {
      since: z.string().optional().describe('ISO date to start the activity history from'),
      amount: z.number().int().positive().optional().describe('Number of history entries to return'),
    },
    handler: (args) =>
      runTool(async () => {
        const { since, amount } = args as { since?: string; amount?: number };
        const result = await container.useCases.statistics.getGeneralStatistics.execute(since, amount);
        return {
          alertsLast24Hours: result.alertsLast24Hours,
          activeDecisions: result.activeDecisions,
          activityHistory: result.activityHistory,
          topCountries: result.topCountries.map((country) => ({ countryCode: country.item, amount: country.amount })),
          topScenarios: result.topScenarios,
          topIpOwners: result.topIpOwners.map((owner) => ({ ipOwner: owner.item, amount: owner.amount })),
          topTargets: result.topTargets.map((target) => ({ target: target.item, amount: target.amount })),
        };
      }),
  },
  {
    name: 'get_top_countries',
    description: 'Get the full list of top countries by alert count.',
    handler: () => runTool(() => container.useCases.statistics.getTopCountries.execute()),
  },
  {
    name: 'get_country_history',
    description: 'Get alerts grouped by date for a specific country (2-letter ISO code).',
    inputSchema: {
      country: z.string().describe('Country code, e.g. "US"'),
    },
    handler: (args) =>
      runTool(() => {
        const { country } = args as { country: string };
        return container.useCases.statistics.getCountryHistory.execute(String(country).toUpperCase());
      }),
  },
  {
    name: 'get_top_ip_owners',
    description: 'Get the full list of top IP owners (organizations) by alert count.',
    handler: () => runTool(() => container.useCases.statistics.getTopIpOwners.execute()),
  },
  {
    name: 'get_ip_owner_history',
    description: 'Get alerts grouped by date for a specific IP owner (organization).',
    inputSchema: {
      ip_owner: z.string().describe('IP owner name, e.g. "Amazon.com, Inc."'),
    },
    handler: (args) =>
      runTool(() => {
        const { ip_owner } = args as { ip_owner: string };
        return container.useCases.statistics.getIpOwnerHistory.execute(ip_owner);
      }),
  },
  {
    name: 'get_top_scenarios',
    description: 'Get the full list of top scenarios by alert count.',
    handler: () => runTool(() => container.useCases.statistics.getTopScenarios.execute()),
  },
  {
    name: 'get_scenario_history',
    description: 'Get alerts grouped by date for a specific scenario.',
    inputSchema: {
      scenario: z.string().describe('Scenario name, e.g. "crowdsecurity/ssh-bf"'),
    },
    handler: (args) =>
      runTool(() => {
        const { scenario } = args as { scenario: string };
        return container.useCases.statistics.getScenarioHistory.execute(scenario);
      }),
  },
  {
    name: 'get_top_targets',
    description: 'Get the full list of top targets (FQDNs) by alert count.',
    handler: () => runTool(() => container.useCases.statistics.getTopTargets.execute()),
  },
  {
    name: 'get_target_history',
    description: 'Get alerts grouped by date for a specific target (FQDN).',
    inputSchema: {
      target: z.string().describe('Target FQDN, e.g. "api.example.com"'),
    },
    handler: (args) =>
      runTool(() => {
        const { target } = args as { target: string };
        return container.useCases.statistics.getTargetHistory.execute(target);
      }),
  },
];
