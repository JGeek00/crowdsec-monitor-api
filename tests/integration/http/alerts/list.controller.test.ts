import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup/setup-app';
import { makeAlert } from '@tests/setup/factories';
import { NAMED_ABBREVIATION, NAMED_ABBREVIATION_CANONICAL } from '@tests/setup/timestamp-fixtures';

const CANONICAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

describe('getAllAlerts', () => {
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

  it('returns 200 with empty items on empty DB', async () => {
    const res = await app.request.get('/api/v1/alerts');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('returns seeded alerts', async () => {
    await app.seedDb({ alerts: [makeAlert({ scenario: 'crowdsec/ssh-bf' })] });
    const res = await app.request.get('/api/v1/alerts');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].scenario).toBe('crowdsec/ssh-bf');
  });

  it('returns pagination shape', async () => {
    const alerts = Array.from({ length: 5 }, (_, i) => makeAlert({ id: i + 1 }));
    await app.seedDb({ alerts });
    const res = await app.request.get('/api/v1/alerts?limit=2&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.total).toBe(5);
    expect(res.body.pagination.amount).toBe(2);
  });

  it('returns 400 when offset exceeds total', async () => {
    const res = await app.request.get('/api/v1/alerts?offset=10');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('filters by scenario', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1, scenario: 'crowdsec/ssh-bf' }), makeAlert({ id: 2, scenario: 'crowdsec/http-bf' })],
    });
    const res = await app.request.get('/api/v1/alerts?scenario=ssh-bf');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('filters by simulated flag', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1, simulated: false }), makeAlert({ id: 2, simulated: true })],
    });
    const res = await app.request.get('/api/v1/alerts?simulated=true');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('returns filtering options', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const res = await app.request.get('/api/v1/alerts');
    expect(res.status).toBe(200);
    expect(res.body.filtering).toBeDefined();
    expect(Array.isArray(res.body.filtering.countries)).toBe(true);
    expect(Array.isArray(res.body.filtering.scenarios)).toBe(true);
  });

  it('returns unpaged response with total when unpaged=true', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const res = await app.request.get('/api/v1/alerts?unpaged=true');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeUndefined();
    expect(res.body.total).toBe(1);
  });

  describe('start_timestamp / end_timestamp range filtering', () => {
    beforeEach(async () => {
      await app.seedDb({
        alerts: [
          makeAlert({ id: 1, crowdsec_created_at: new Date('2020-01-01T00:00:00Z') }),
          makeAlert({ id: 2, crowdsec_created_at: new Date('2020-01-02T00:00:00Z') }),
          makeAlert({ id: 3, crowdsec_created_at: new Date('2020-01-03T00:00:00Z') }),
        ],
      });
    });

    it('filters alerts within the range (bounds inclusive)', async () => {
      const res = await app.request.get(
        '/api/v1/alerts?start_timestamp=2020-01-01:00:00:00&end_timestamp=2020-01-02:23:59:59',
      );
      expect(res.status).toBe(200);
      expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([2, 1]);
    });

    it('includes alerts exactly at end_timestamp', async () => {
      const res = await app.request.get('/api/v1/alerts?end_timestamp=2020-01-02:00:00:00');
      expect(res.status).toBe(200);
      expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([2, 1]);
    });

    it('includes alerts exactly at start_timestamp', async () => {
      const res = await app.request.get('/api/v1/alerts?start_timestamp=2020-01-03:00:00:00');
      expect(res.status).toBe(200);
      expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([3]);
    });

    it('filters with end_timestamp only', async () => {
      const res = await app.request.get('/api/v1/alerts?end_timestamp=2020-01-01:00:00:00');
      expect(res.status).toBe(200);
      expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([1]);
    });

    it('filters with start_timestamp only', async () => {
      const res = await app.request.get('/api/v1/alerts?start_timestamp=2020-01-02:00:00:00');
      expect(res.status).toBe(200);
      expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([3, 2]);
    });

    it('returns 400 for an invalid start_timestamp format', async () => {
      const res = await app.request.get('/api/v1/alerts?start_timestamp=2020-01-01T00:00:00');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
      expect(res.body.message).toMatch(/start_timestamp.*yyyy-MM-dd:hh:mm:ss.*UTC/);
    });

    it('returns 400 for an impossible calendar date', async () => {
      const res = await app.request.get('/api/v1/alerts?start_timestamp=2020-02-30:00:00:00');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
    });

    it('returns 400 when end_timestamp is not later than start_timestamp', async () => {
      const res = await app.request.get(
        '/api/v1/alerts?start_timestamp=2020-01-02:00:00:00&end_timestamp=2020-01-01:00:00:00',
      );
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
      expect(res.body.message).toMatch(/end_timestamp.*later than start_timestamp/);
    });

    it('returns 400 when a timestamp is in the future', async () => {
      const res = await app.request.get('/api/v1/alerts?start_timestamp=2099-01-01:00:00:00');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
      expect(res.body.message).toMatch(/start_timestamp.*in the future/);

      const resEnd = await app.request.get('/api/v1/alerts?end_timestamp=2099-01-01:00:00:00');
      expect(resEnd.status).toBe(400);
      expect(resEnd.body.message).toMatch(/end_timestamp.*in the future/);
    });
  });

  it('returns every timestamp field in canonical format (events and date-typed fields)', async () => {
    await app.seedDb({
      alerts: [
        makeAlert({
          id: 9,
          events: [{ timestamp: NAMED_ABBREVIATION, meta: [] }],
        }),
      ],
    });
    const res = await app.request.get('/api/v1/alerts');
    expect(res.status).toBe(200);
    expect(res.body.items[0].events[0].timestamp).toBe(NAMED_ABBREVIATION_CANONICAL);
    expect(res.body.items[0].crowdsec_created_at).toMatch(CANONICAL_PATTERN);
    expect(res.body.items[0].start_at).toMatch(CANONICAL_PATTERN);
    expect(res.body.items[0].stop_at).toMatch(CANONICAL_PATTERN);
  });
});
