/**
 * HTTP contract barrel for delivery/http modules: presenters (out shapes),
 * schemas (in shapes), shared HTTP models and domain entity types.
 * Legacy table imports from the persistence layer are included for the
 * not-yet-migrated controllers (removed in the legacy-controller cleanup).
 */
export * from './presenters';
export * from './schemas';
export * from '@/shared/models';
export * from '@/domain/entities';
export * from '@/infrastructure/persistence/sequelize/models';
