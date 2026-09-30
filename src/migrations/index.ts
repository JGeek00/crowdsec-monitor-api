import { MigrationTask } from '@/types/migration-task.types';
import migration0001 from './0001_add_last_refresh_failed_to_blocklists';
import migration0002 from './0002_create_notifications';

export const migrations: MigrationTask[] = [
  {
    ...migration0001,
    timestamp: Date.now(),
  },
  {
    ...migration0002,
    timestamp: Date.now(),
  },
];

export const getMigrations = (): MigrationTask[] => migrations;

export const getPendingMigrations = (applied: string[]): MigrationTask[] => {
  return migrations.filter((m) => !applied.includes(m.name));
};
