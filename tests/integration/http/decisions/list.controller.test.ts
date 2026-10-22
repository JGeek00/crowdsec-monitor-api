import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup/setup-app';
import { makeDecision, makeAlert } from '@tests/setup/factories';

const CANONICAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
describe('getAllDecisions', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM decisions');
    await app.sequelize.query('DELETE FROM alerts');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('returns 200 with empty items on empty DB', async () => {
    const res = await app.request.get('/api/v1/decisions');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('returns seeded decisions', async () => {
    await app.seedDb({ alerts: [makeAlert()], decisions: [makeDecision({ alert_id: 1 })] });
    const res = await app.request.get('/api/v1/decisions');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('returns pagination shape', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const decisions = Array.from({ length: 3 }, (_, i) => makeDecision({ id: i + 1, alert_id: 1 }));
    await app.seedDb({ decisions });
    const res = await app.request.get('/api/v1/decisions?limit=1&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.amount).toBe(1);
  });

  it('filters by type', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    await app.seedDb({
      decisions: [
        makeDecision({ id: 1, alert_id: 1, type: 'ban' }),
        makeDecision({ id: 2, alert_id: 1, type: 'captcha' }),
      ],
    });
    const res = await app.request.get('/api/v1/decisions?type=ban');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('returns filtering options', async () => {
    await app.seedDb({ alerts: [makeAlert()], decisions: [makeDecision({ alert_id: 1 })] });
    const res = await app.request.get('/api/v1/decisions');
    expect(res.status).toBe(200);
    expect(res.body.filtering).toBeDefined();
  });

  it('returns 400 when offset exceeds total', async () => {
    const res = await app.request.get('/api/v1/decisions?offset=10');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('returns total when unpaged=true', async () => {
    await app.seedDb({ alerts: [makeAlert()], decisions: [makeDecision({ alert_id: 1 })] });
    const res = await app.request.get('/api/v1/decisions?unpaged=true');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.pagination).toBeUndefined();
  });

  describe('start_timestamp / end_timestamp range filtering', () => {
    beforeEach(async () => {
      await app.seedDb({ alerts: [makeAlert()] });
      await app.seedDb({
        decisions: [
          makeDecision({ id: 1, alert_id: 1, crowdsec_created_at: new Date('2020-01-01T00:00:00Z') }),
          makeDecision({ id: 2, alert_id: 1, crowdsec_created_at: new Date('2020-01-02T00:00:00Z') }),
          makeDecision({ id: 3, alert_id: 1, crowdsec_created_at: new Date('2020-01-03T00:00:00Z') }),
        ],
      });
    });

    it('filters decisions within the range (bounds inclusive)', async () => {
      const res = await app.request.get(
        '/api/v1/decisions?start_timestamp=2020-01-01:00:00:00&end_timestamp=2020-01-02:23:59:59',
      );
      expect(res.status).toBe(200);
      expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([2, 1]);
    });

    it('includes decisions exactly at end_timestamp', async () => {
      const res = await app.request.get('/api/v1/decisions?end_timestamp=2020-01-02:00:00:00');
      expect(res.status).toBe(200);
      expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([2, 1]);
    });

    it('includes decisions exactly at start_timestamp', async () => {
      const res = await app.request.get('/api/v1/decisions?start_timestamp=2020-01-03:00:00:00');
      expect(res.status).toBe(200);
      expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([3]);
    });

    it('filters with end_timestamp only', async () => {
      const res = await app.request.get('/api/v1/decisions?end_timestamp=2020-01-01:00:00:00');
      expect(res.status).toBe(200);
      expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([1]);
    });

    it('filters with start_timestamp only', async () => {
      const res = await app.request.get('/api/v1/decisions?start_timestamp=2020-01-02:00:00:00');
      expect(res.status).toBe(200);
      expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([3, 2]);
    });

    it('returns 400 for an invalid start_timestamp format', async () => {
      const res = await app.request.get('/api/v1/decisions?start_timestamp=2020-01-01T00:00:00');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
      expect(res.body.message).toMatch(/start_timestamp.*yyyy-MM-dd:hh:mm:ss.*UTC/);
    });

    it('returns 400 for an impossible calendar date', async () => {
      const res = await app.request.get('/api/v1/decisions?end_timestamp=2019-02-29:00:00:00');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
    });

    it('returns 400 when end_timestamp is not later than start_timestamp', async () => {
      const res = await app.request.get(
        '/api/v1/decisions?start_timestamp=2020-01-02:00:00:00&end_timestamp=2020-01-01:00:00:00',
      );
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
      expect(res.body.message).toMatch(/end_timestamp.*later than start_timestamp/);
    });

    it('returns 400 when a timestamp is in the future', async () => {
      const res = await app.request.get('/api/v1/decisions?start_timestamp=2099-01-01:00:00:00');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
      expect(res.body.message).toMatch(/start_timestamp.*in the future/);

      const resEnd = await app.request.get('/api/v1/decisions?end_timestamp=2099-01-01:00:00:00');
      expect(resEnd.status).toBe(400);
      expect(resEnd.body.message).toMatch(/end_timestamp.*in the future/);
    });
  });

  it('returns decision timestamps in canonical format', async () => {
    await app.seedDb({ alerts: [makeAlert()], decisions: [makeDecision({ alert_id: 1 })] });
    const res = await app.request.get('/api/v1/decisions');
    expect(res.status).toBe(200);
    expect(res.body.items[0].expiration).toMatch(CANONICAL_PATTERN);
    expect(res.body.items[0].crowdsec_created_at).toMatch(CANONICAL_PATTERN);
  });
});
