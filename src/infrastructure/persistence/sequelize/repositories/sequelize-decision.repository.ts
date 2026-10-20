import { DecisionsTable, AlertsTable } from '@/infrastructure/persistence/sequelize/models';
import type { Decision } from '@/domain/entities';
import { DB_SORTING } from '@/types/database.types';
import {
  buildDecisionsWhere,
  fetchFilteringOptions as fetchFilteringOptionsQuery,
  DECISIONS_QUERY,
} from '@/infrastructure/persistence/sequelize/decisions-query';
import type {
  DecisionRepository as DecisionRepositoryPort,
  DecisionQueryOptions,
} from '@/application/ports/decision-repository.port';
import type { FilteringInfo } from '@/application/use-cases/decisions/decisions.dto';

/**
 * Sequelize implementation of the DecisionRepository port.
 * Note (R3): decisions belong to the alert aggregate; this port exists for the
 * decision endpoints that read/write decisions without their parent alert.
 */
export class SequelizeDecisionRepository implements DecisionRepositoryPort {
  async findById(id: number, options?: DecisionQueryOptions): Promise<Decision | null> {
    const row = await DecisionsTable.findByPk(id, {
      attributes: { exclude: [DecisionsTable.col.createdAt, DecisionsTable.col.updatedAt] },
      include: options?.withAlert
        ? [
            {
              model: AlertsTable,
              as: 'alert',
              attributes: { exclude: [AlertsTable.col.createdAt, AlertsTable.col.updatedAt] },
            },
          ]
        : undefined,
    });
    return row ? (row.toJSON() as Decision) : null;
  }

  async findByQuery(query: Record<string, unknown>, options?: DecisionQueryOptions): Promise<Decision[]> {
    const where = buildDecisionsWhere(query, options?.group ?? false);
    const rows = await DecisionsTable.findAll({
      where: where as never,
      ...DECISIONS_QUERY,
      include: options?.withAlert
        ? [
            {
              model: AlertsTable,
              as: 'alert',
              attributes: { exclude: [AlertsTable.col.createdAt, AlertsTable.col.updatedAt] },
            },
          ]
        : undefined,
    });
    return rows.map((row) => row.toJSON() as unknown as Decision);
  }

  async fetchFilteringOptions(): Promise<FilteringInfo> {
    return fetchFilteringOptionsQuery();
  }

  async findByIp(ip: string, options?: DecisionQueryOptions): Promise<Decision[]> {
    const rows = await DecisionsTable.findAll({
      where: { value: ip } as never,
      ...{
        attributes: { exclude: [DecisionsTable.col.createdAt, DecisionsTable.col.updatedAt] },
        order: [[DecisionsTable.col.crowdsecCreatedAt, DB_SORTING.DESC]],
      },
      include: options?.withAlert
        ? [
            {
              model: AlertsTable,
              as: 'alert',
              attributes: { exclude: [AlertsTable.col.createdAt, AlertsTable.col.updatedAt] },
            },
          ]
        : undefined,
    });
    return rows.map((row) => row.toJSON() as unknown as Decision);
  }

  async create(decision: Omit<Decision, 'id' | 'created_at' | 'updated_at'>): Promise<Decision> {
    const row = await DecisionsTable.create({ ...decision, created_at: new Date(), updated_at: new Date() });
    return row.toJSON() as Decision;
  }

  async deleteById(id: number): Promise<boolean> {
    const deleted = await DecisionsTable.destroy({ where: { [DecisionsTable.col.id]: id } });
    return deleted > 0;
  }

  async expireById(id: number): Promise<void> {
    await DecisionsTable.update(
      { expiration: new Date(), updated_at: new Date() },
      { where: { [DecisionsTable.col.id]: id } },
    );
  }

  async getStats(): Promise<{ total: number; byType: unknown[]; byScope: unknown[] }> {
    const total = (await DecisionsTable.count()) as number;

    const byType = (await DecisionsTable.findAll({
      attributes: [
        'type',
        [DecisionsTable.sequelize!.fn('COUNT', DecisionsTable.sequelize!.col(DecisionsTable.col.id)), 'count'],
      ],
      group: ['type'],
      order: [
        [DecisionsTable.sequelize!.fn('COUNT', DecisionsTable.sequelize!.col(DecisionsTable.col.id)), DB_SORTING.DESC],
      ],
    })) as unknown as unknown[];

    const byScope = (await DecisionsTable.findAll({
      attributes: [
        'scope',
        [DecisionsTable.sequelize!.fn('COUNT', DecisionsTable.sequelize!.col(DecisionsTable.col.id)), 'count'],
      ],
      group: ['scope'],
      order: [
        [DecisionsTable.sequelize!.fn('COUNT', DecisionsTable.sequelize!.col(DecisionsTable.col.id)), DB_SORTING.DESC],
      ],
    })) as unknown as unknown[];

    return { total, byType, byScope };
  }
}
