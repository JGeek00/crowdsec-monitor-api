import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup/setup-app';
import { makeAlert } from '@tests/setup/factories';
import type { Alert_EventData, Alert } from '@/domain/entities';
import type { UnparsedMetaData } from '@/shared/models';

function alertWithTarget(id: number, target: string): Alert<UnparsedMetaData> {
  const base = makeAlert({ id, scenario: 'ssh-bf' });
  const events = base.events as Alert_EventData<UnparsedMetaData>[];
  return {
    ...base,
    events: [
      {
        ...events[0],
        meta: [{ key: 'target_fqdn', value: target }],
      },
    ],
  };
}

describe('e2e statistics detail endpoints', () => {
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

  it('GET /api/v1/statistics/countries/US returns day-by-day history for seeded alerts', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 1 }), makeAlert({ id: 2, source: { ...makeAlert().source, cn: 'FR' } })] });

    const res = await app.request.get('/api/v1/statistics/countries/US');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].amount).toBe(1);
  });

  it('GET /api/v1/statistics/countries/:item returns empty history for an unknown country', async () => {
    const res = await app.request.get('/api/v1/statistics/countries/XX');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('GET /api/v1/statistics/scenarios/:item returns history for the seeded scenario', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 1, scenario: 'ssh-bf' })] });

    const res = await app.request.get('/api/v1/statistics/scenarios/ssh-bf');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].amount).toBe(1);
  });

  it('GET /api/v1/statistics/targets/:item returns history for a seeded target', async () => {
    await app.seedDb({ alerts: [alertWithTarget(1, 'example.com')] });

    const res = await app.request.get('/api/v1/statistics/targets/example.com');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].amount).toBe(1);
  });

  it('GET /api/v1/statistics/ip-owners lists owners ordered by alerts', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1 }), makeAlert({ id: 2, source: { ...makeAlert().source, as_name: 'OTHER-AS' } })],
    });

    const res = await app.request.get('/api/v1/statistics/ip-owners');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toEqual({ ipOwner: 'EXAMPLE-AS', amount: 1 });
  });

  it('GET /api/v1/statistics/ip-owners/:item returns history for a seeded owner', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 1 })] });

    const res = await app.request.get('/api/v1/statistics/ip-owners/EXAMPLE-AS');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].amount).toBe(1);
  });

  it('history dates use the canonical timestamp format', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 1 })] });

    const res = await app.request.get('/api/v1/statistics/countries/US');
    expect(res.body[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
