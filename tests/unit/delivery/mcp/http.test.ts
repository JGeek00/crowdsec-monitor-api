import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import { createMcpServer } from '@/delivery/mcp/server';
import { mcpHttpRouter } from '@/delivery/mcp/http';

vi.mock('@/delivery/mcp/server', () => ({
  createMcpServer: vi.fn(() => ({})),
}));

describe('mcpHttpRouter methods', () => {
  it('answers 405 on GET and DELETE (stateless mode only supports POST)', async () => {
    const app = express();
    app.use('/mcp', mcpHttpRouter);
    const request = supertest(app);

    const getRes = await request.get('/mcp');
    expect(getRes.status).toBe(405);
    expect(getRes.body.error).toBe('Method Not Allowed');

    const deleteRes = await request.delete('/mcp');
    expect(deleteRes.status).toBe(405);
  });

  it('answers a JSON-RPC internal error echoing the id when the server fails', async () => {
    vi.mocked(createMcpServer).mockImplementationOnce(() => {
      throw new Error('connect boom');
    });
    const app = express();
    app.use(express.json());
    app.use('/mcp', mcpHttpRouter);

    const res = await supertest(app)
      .post('/mcp')
      .set({ 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' })
      .send({ jsonrpc: '2.0', id: 5, method: 'initialize', params: {} });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ jsonrpc: '2.0', id: 5, error: { code: -32603, message: 'connect boom' } });
  });

  it('uses null id when the failing body carries none', async () => {
    vi.mocked(createMcpServer).mockImplementationOnce(() => {
      throw new Error('connect boom');
    });
    const app = express();
    app.use(express.json());
    app.use('/mcp', mcpHttpRouter);

    const res = await supertest(app)
      .post('/mcp')
      .set({ 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' })
      .send({});
    expect(res.status).toBe(500);
    expect(res.body.id).toBeNull();
  });
});
