import { Router, type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './server';

/**
 * Streamable HTTP transport for the MCP server (stateless mode).
 *
 * Mounted at `/mcp` (its own protocol, not part of the REST API) behind
 * `AuthMiddleware.expressAuth`, so the
 * Bearer-token rule is exactly the REST one (S7): enforced when
 * `API_PASSWORD` is set, open otherwise. Stateless mode needs only POST;
 * GET/DELETE answer 405.
 */
export const handleMcpPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      void transport.close().catch(() => undefined);
      void server.close().catch(() => undefined);
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err: unknown) {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        id: (req.body as { id?: unknown } | undefined)?.id ?? null,
        error: { code: -32603, message: err instanceof Error ? err.message : 'Internal error' },
      });
    }
  }
};

const methodNotAllowed = (_req: Request, res: Response): void => {
  res.status(405).json({ error: 'Method Not Allowed', message: 'This MCP endpoint only supports POST requests.' });
};

export const mcpHttpRouter: Router = Router();
mcpHttpRouter.post('/', handleMcpPost);
mcpHttpRouter.get('/', methodNotAllowed);
mcpHttpRouter.delete('/', methodNotAllowed);
