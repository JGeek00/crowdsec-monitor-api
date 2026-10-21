import { describe, it, expect } from 'vitest';
import { mcpToolRegistry } from '@/delivery/mcp/tools/registry';

const EXPECTED_TOOLS = [
  // statistics (9)
  'get_statistics',
  'get_top_countries',
  'get_country_history',
  'get_top_ip_owners',
  'get_ip_owner_history',
  'get_top_scenarios',
  'get_scenario_history',
  'get_top_targets',
  'get_target_history',
  // alerts (4)
  'list_alerts',
  'get_alert',
  'get_alerts_stats',
  'delete_alert',
  // decisions (7)
  'list_decisions',
  'get_decision',
  'list_decisions_by_ip',
  'get_decision_by_ip',
  'get_decisions_stats',
  'create_decision',
  'delete_decision',
  // lists, read-only (5)
  'list_blocklists',
  'get_blocklist',
  'get_blocklist_ips',
  'list_allowlists',
  'get_allowlist',
  // lists, single-IP check (1)
  'check_ip_in_lists',
];

describe('mcp tool registry', () => {
  it('exposes exactly the authorized tools', () => {
    const names = mcpToolRegistry.map((tool) => tool.name);
    expect(names).toHaveLength(26);
    expect(names).toEqual(expect.arrayContaining(EXPECTED_TOOLS));
    expect(new Set(names).size).toBe(names.length);
  });

  it('exposes no notification tools', () => {
    const names = mcpToolRegistry.map((tool) => tool.name);
    expect(names.some((name) => name.includes('notif'))).toBe(false);
  });

  it('exposes no blocklist/allowlist write tools', () => {
    const names = mcpToolRegistry.map((tool) => tool.name);
    for (const forbidden of ['create_blocklist', 'delete_blocklist', 'toggle_blocklist', 'refresh_blocklist']) {
      expect(names).not.toContain(forbidden);
    }
  });

  it('gives every tool a description and a handler', () => {
    for (const tool of mcpToolRegistry) {
      expect(tool.description.length).toBeGreaterThan(0);
      expect(typeof tool.handler).toBe('function');
    }
  });
});
