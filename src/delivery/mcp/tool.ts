import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { NotFoundError } from '@/domain/errors';

/** Text payload returned by every MCP tool (results are JSON-encoded domain data). */
export interface McpTextResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

/** A single MCP tool definition: SDK registration data plus its use-case handler. */
export interface McpToolDefinition<InputArgs extends ZodRawShapeCompat | undefined = ZodRawShapeCompat | undefined> {
  name: string;
  description: string;
  inputSchema?: InputArgs;
  handler: (args: unknown) => Promise<McpTextResult>;
}

/** Wraps use-case results as MCP text content (JSON-encoded, as the REST body would be). */
export const textResult = (data: unknown): McpTextResult => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data) }],
});

/**
 * Maps handler errors to MCP results. Domain `NotFoundError`s (unknown id/name)
 * become non-throwing `isError` results so the client sees the reason; anything
 * else propagates and the SDK turns it into a JSON-RPC internal error.
 */
export const toolErrorResult = (err: unknown): McpTextResult => {
  if (err instanceof NotFoundError) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Not found', message: err.message }) }],
      isError: true,
    };
  }
  throw err;
};

/** Runs a use-case call inside the standard result/error mapping. */
export const runTool = async (fn: () => Promise<unknown>): Promise<McpTextResult> => {
  try {
    return textResult(await fn());
  } catch (err: unknown) {
    return toolErrorResult(err);
  }
};

export type { McpServer };
