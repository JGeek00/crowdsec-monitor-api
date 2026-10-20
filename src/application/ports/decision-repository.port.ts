import type { Decision } from '@/domain/entities/decision.entity';

// Implemented by: infrastructure/persistence/sequelize/repositories/sequelize-decision.repository.ts
// Called by: application/use-cases/decisions/*
export interface DecisionQueryOptions {
  withAlert?: boolean;
}

export interface DecisionRepository {
  findById(id: number, options?: DecisionQueryOptions): Promise<Decision | null>;
  /** Query with the decisions list filters (already built by the use case). */
  findWithQuery(where: unknown, options?: DecisionQueryOptions): Promise<Decision[]>;
  findByIp(ip: string, options?: DecisionQueryOptions): Promise<Decision[]>;
  create(decision: Omit<Decision, 'id' | 'created_at' | 'updated_at'>): Promise<Decision>;
  deleteById(id: number): Promise<boolean>;
  /** Marks a decision expired locally (legacy delete semantics). */
  expireById(id: number): Promise<void>;
  /** Aggregate counters for the decisions stats endpoint. */
  getStats(): Promise<{ total: number; byType: unknown[]; byScope: unknown[] }>;
}
