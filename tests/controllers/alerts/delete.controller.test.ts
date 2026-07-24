import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';

describe('deleteAlert', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM alerts');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('returns 400 for invalid alert ID', async () => {
    const res = await app.request.delete('/api/v1/alerts/invalid');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid alert ID');
  });

  it('returns 404 when alert does not exist in DB', async () => {
    const res = await app.request.delete('/api/v1/alerts/999');
    expect(res.status).toBe(404);
  });
});
