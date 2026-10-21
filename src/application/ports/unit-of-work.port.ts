// Implemented by: infrastructure/persistence/sequelize/sequelize-unit-of-work.ts
// Called by: application/use-cases/* that need transactional writes
export interface UnitOfWork {
  /** Runs `fn` inside one database transaction; rolls back on throw. */
  run<T>(fn: () => Promise<T>): Promise<T>;
}
