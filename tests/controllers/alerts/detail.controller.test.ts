import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeAlert, makeDecision } from '@tests/factories';
import {
  NAMED_ABBREVIATION,
  NAMED_ABBREVIATION_CANONICAL,
  DUPLICATED_OFFSET,
  DUPLICATED_OFFSET_CANONICAL,
  UNPARSEABLE,
} from '@tests/helpers/timestamp-fixtures';

describe('getAlertById', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM alerts');
    await app.sequelize.query('DELETE FROM decisions');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('returns 200 and alert when found', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 1 })] });
    const res = await app.request.get('/api/v1/alerts/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('returns 404 when alert is not found', async () => {
    const res = await app.request.get('/api/v1/alerts/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  it('includes associated decisions', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1 })],
      decisions: [makeDecision({ id: 1, alert_id: 1 })],
    });
    const res = await app.request.get('/api/v1/alerts/1');
    expect(res.status).toBe(200);
    expect(res.body.decisions).toBeDefined();
    expect(res.body.decisions).toHaveLength(1);
  });

  it('returns every event timestamp in canonical format, preserving original offsets', async () => {
    await app.seedDb({
      alerts: [
        makeAlert({
          id: 1,
          events_count: 3,
          events: [
            { timestamp: NAMED_ABBREVIATION, meta: [] },
            { timestamp: DUPLICATED_OFFSET, meta: [] },
            { timestamp: UNPARSEABLE, meta: [] },
          ],
        }),
      ],
    });
    const res = await app.request.get('/api/v1/alerts/1');
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(3);
    expect(res.body.events[0].timestamp).toBe(NAMED_ABBREVIATION_CANONICAL);
    expect(res.body.events[1].timestamp).toBe(DUPLICATED_OFFSET_CANONICAL);
    expect(res.body.events[2].timestamp).toBeNull();
  });

  it('renders alert Date-typed fields in canonical format', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 2 })] });
    const res = await app.request.get('/api/v1/alerts/2');
    expect(res.status).toBe(200);
    expect(res.body.crowdsec_created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(res.body.start_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(res.body.stop_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('logs the conversion failure identifying the alert and the original value', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await app.seedDb({
        alerts: [
          makeAlert({
            id: 3,
            events: [{ timestamp: UNPARSEABLE, meta: [] }],
          }),
        ],
      });
      const res = await app.request.get('/api/v1/alerts/3');
      expect(res.status).toBe(200);
      expect(res.body.events[0].timestamp).toBeNull();
      const output = warnSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(output).toContain('alert');
      expect(output).toContain('3');
      expect(output).toContain(UNPARSEABLE);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
