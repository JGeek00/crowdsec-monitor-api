import { describe, it, expect, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '@/delivery/mcp/server';
import { mcpToolRegistry } from '@/delivery/mcp/tools/registry';
import type { McpToolDefinition } from '@/delivery/mcp/tool';

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
    expect(tools).toHaveLength(26);
    expect(tools.map((tool) => tool.name)).toEqual(expect.arrayContaining(['get_statistics', 'delete_alert']));
  });

  it('registers a custom tool subset when provided', async () => {
    const tools = await listTools(['get_alerts_stats']);
    expect(tools.map((tool) => tool.name)).toEqual(['get_alerts_stats']);
  });

  it('logs each tool call with the tool name', async () => {
    const fakeTool: McpToolDefinition = {
      name: 'fake_tool',
      description: 'test',
      handler: async () => ({ content: [{ type: 'text', text: '{}' }] }),
    };
    const server = createMcpServer([fakeTool]);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'unit-test-client', version: '1.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
      try {
        await client.callTool({ name: 'fake_tool', arguments: {} });
        expect(infoSpy.mock.calls.join('\n')).toContain('fake_tool');
      } finally {
        infoSpy.mockRestore();
      }
    } finally {
      await client.close();
      await server.close();
    }
  });
});
