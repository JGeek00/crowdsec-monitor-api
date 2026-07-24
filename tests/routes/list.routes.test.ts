import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';

describe('list routes', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('POST /api/v1/lists/check-ips returns 200', async () => {
    const res = await app.request.post('/api/v1/lists/check-ips').send({ ips: ['1.2.3.4'] });
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/lists/check-ips returns 400 with invalid IPs', async () => {
    const res = await app.request.post('/api/v1/lists/check-ips').send({ ips: ['not-an-ip'] });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/lists/check-domain returns 422 for unresolvable domain', async () => {
    const res = await app.request.post('/api/v1/lists/check-domain').send({ domain: 'nonexistent.invalid' });
    expect(res.status).toBe(422);
  });

  it('POST /api/v1/lists/refresh returns 202', async () => {
    const res = await app.request.post('/api/v1/lists/refresh');
    expect(res.status).toBe(202);
  });
});
