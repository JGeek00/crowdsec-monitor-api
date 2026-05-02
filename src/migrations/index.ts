import type { Migration } from '@/types/migration-task.types';
import migration0001 from './0001_add_last_refresh_failed_to_blocklists';

export const migrations: Migration[] = [
  {
    ...migration0001,
    timestamp: Date.now(),
  },
];

export const getMigrations = (): Migration[] => migrations;

export const getPendingMigrations = (applied: string[]): Migration[] => {
  return migrations.filter((m) => !applied.includes(m.name));
};
