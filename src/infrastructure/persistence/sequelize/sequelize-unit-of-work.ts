import { sequelize } from '@/config/database';
import type { UnitOfWork } from '@/application/ports/unit-of-work.port';

// Implemented by: this file (UnitOfWork port)
// Called by: application/use-cases/* that need transactional writes
export class SequelizeUnitOfWork implements UnitOfWork {
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return sequelize.transaction(fn);
  }
}
