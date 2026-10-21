import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '@/delivery/mcp/server';
import { mcpToolRegistry } from '@/delivery/mcp/tools/registry';

const listTools = async (toolNames?: string[]): Promise<{ name: string; description?: string }[]> => {
  const server = createMcpServer(
    toolNames === undefined ? undefined : mcpToolRegistry.filter((tool) => toolNames.includes(tool.name)),
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'unit-test-client', version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const { tools } = await client.listTools();
    return tools;
  } finally {
    await client.close();
    await server.close();
  }
};

describe('createMcpServer', () => {
  it('is named crowdsec-monitor and lists the full registry', async () => {
    const tools = await listTools();
    expect(tools).toHaveLength(25);
    expect(tools.map((tool) => tool.name)).toEqual(expect.arrayContaining(['get_statistics', 'delete_alert']));
  });

  it('registers a custom tool subset when provided', async () => {
    const tools = await listTools(['get_alerts_stats']);
    expect(tools.map((tool) => tool.name)).toEqual(['get_alerts_stats']);
  });
});
