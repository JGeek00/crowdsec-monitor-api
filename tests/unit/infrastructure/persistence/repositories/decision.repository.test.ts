import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { cleanRepoDb, closeRepoDb, initRepoDb } from '@tests/setup/repo-db';
import { makeAlert, makeDecision } from '@tests/setup/factories';
import type { Decision } from '@/domain/entities';
import { AlertsTable, DecisionsTable } from '@/infrastructure/persistence/sequelize/models';
import { SequelizeDecisionRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-decision.repository';

describe('SequelizeDecisionRepository', () => {
  let repo: SequelizeDecisionRepository;

  beforeAll(async () => {
    await initRepoDb();
    repo = new SequelizeDecisionRepository();
  });
  beforeEach(cleanRepoDb);
  afterAll(closeRepoDb);

  let decisionId = 10;

  /** Seeds one alert + one decision through the real tables and returns both ids. */
  const seedDecision = async (overrides: Partial<Decision> = {}): Promise<{ alertId: number; decisionId: number }> => {
    const existingAlert = await AlertsTable.findOne();
    const alert = existingAlert ?? (await AlertsTable.create(makeAlert()));
    const decision = await DecisionsTable.create(
      makeDecision({
        id: decisionId++,
        alert_id: alert.id,
        value: '1.2.3.4',
        type: 'ban',
        scope: 'Ip',
        ...overrides,
      }),
    );
    return { alertId: alert.id, decisionId: decision.id };
  };

  it('findById returns null for a missing decision and the row when present', async () => {
    const { decisionId } = await seedDecision();

    const found = await repo.findById(decisionId);
    expect(found?.id).toBe(decisionId);
    expect(found?.type).toBe('ban');
    expect(await repo.findById(decisionId + 999)).toBeNull();
  });

  it('findById includes the parent alert with withAlert', async () => {
    const { alertId, decisionId } = await seedDecision();

    const found = await repo.findById(decisionId, { withAlert: true });
    expect((found as { alert?: { id: number } }).alert?.id).toBe(alertId);
  });

  it('findByQuery applies the built where clause', async () => {
    await seedDecision();
    await seedDecision({ id: 11, type: 'captcha' });

    const bans = await repo.findByQuery({ type: 'ban' });
    expect(bans).toHaveLength(1);
    expect(bans[0].type).toBe('ban');
  });

  it('findByQuery includes the alert with withAlert', async () => {
    const { alertId } = await seedDecision();

    const rows = await repo.findByQuery({}, { withAlert: true });
    expect((rows[0] as { alert?: { id: number } }).alert?.id).toBe(alertId);
  });

  it('findByIp returns decisions for the exact ip', async () => {
    const { alertId } = await seedDecision();
    await seedDecision({ value: '9.9.9.9' });

    const rows = await repo.findByIp('1.2.3.4');
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe('1.2.3.4');

    const withAlert = await repo.findByIp('1.2.3.4', { withAlert: true });
    expect((withAlert[0] as { alert?: { id: number } }).alert?.id).toBe(alertId);
  });

  it('create persists a decision and returns it', async () => {
    const { alertId } = await seedDecision();
    const created = await repo.create(makeDecision({ id: decisionId++, alert_id: alertId, value: '8.8.8.8' }));
    expect(created.value).toBe('8.8.8.8');
    expect(created.id).toBeGreaterThan(0);
  });

  it('deleteById reports whether the row existed', async () => {
    const { decisionId } = await seedDecision();
    expect(await repo.deleteById(decisionId)).toBe(true);
    expect(await repo.deleteById(decisionId)).toBe(false);
  });

  it('expireById marks the decision expired', async () => {
    const { decisionId } = await seedDecision({ expiration: new Date('2030-01-01T00:00:00Z') } as never);

    await repo.expireById(decisionId);
    const expired = await repo.findById(decisionId);
    expect(new Date((expired as { expiration: string }).expiration).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('getStats totals and groups by type and scope', async () => {
    await seedDecision();
    await seedDecision({ type: 'captcha', scope: 'Range' });

    const stats = await repo.getStats();
    expect(stats.total).toBe(2);
    expect(stats.byType).toHaveLength(2);
    expect(stats.byScope).toHaveLength(2);
  });
});
