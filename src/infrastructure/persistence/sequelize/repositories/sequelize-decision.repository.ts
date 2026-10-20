import { Op } from '@sequelize/core';
import { DecisionsTable } from '@/models/db';
import type { Decision } from '@/models';
import type { DecisionRepository as DecisionRepositoryPort } from '@/application/ports/decision-repository.port';

/**
 * Sequelize implementation of the DecisionRepository port.
 * Note (R3): decisions belong to the alert aggregate; this port exists for the
 * decision endpoints that read/write decisions without their parent alert.
 */
export class SequelizeDecisionRepository implements DecisionRepositoryPort {
  async findById(id: number): Promise<Decision | null> {
    const row = await DecisionsTable.findByPk(id);
    return row ? (row.toJSON() as Decision) : null;
  }

  async findByIp(ip: string): Promise<Decision[]> {
    const rows = await DecisionsTable.findAll({
      where: {
        [DecisionsTable.col.value]: ip,
        [DecisionsTable.col.scope]: 'ip',
        [DecisionsTable.col.expiration]: { [Op.gt]: new Date() },
      },
    });
    return rows.map((row) => row.toJSON() as Decision);
  }

  async create(decision: Omit<Decision, 'id' | 'created_at' | 'updated_at'>): Promise<Decision> {
    const row = await DecisionsTable.create({ ...decision, created_at: new Date(), updated_at: new Date() });
    return row.toJSON() as Decision;
  }

  async deleteById(id: number): Promise<boolean> {
    const deleted = await DecisionsTable.destroy({ where: { [DecisionsTable.col.id]: id } });
    return deleted > 0;
  }
}
