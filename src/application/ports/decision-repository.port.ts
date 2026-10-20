import type { Decision } from '@/domain/entities/decision.entity';

// Implemented by: infrastructure/persistence/sequelize/repositories/sequelize-decision.repository.ts
// Called by: application/use-cases/decisions/*
export interface DecisionRepository {
  findById(id: number): Promise<Decision | null>;
  findByIp(ip: string): Promise<Decision[]>;
  create(decision: Omit<Decision, 'id' | 'created_at' | 'updated_at'>): Promise<Decision>;
  deleteById(id: number): Promise<boolean>;
}
