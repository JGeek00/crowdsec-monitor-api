export interface MigrationTask {
  name: string;
  up: (queryInterface: any) => Promise<void>;
  down: (queryInterface: any) => Promise<void>;
  timestamp: number;
  checksum?: string;
}

export interface MigrationTaskMetadata {
  migrationName: string;
  appliedAt: Date;
  checksum: string;
}

export enum MigrationTaskStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}
