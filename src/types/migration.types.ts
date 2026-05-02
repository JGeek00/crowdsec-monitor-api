export interface Migration {
  name: string;
  up: (queryInterface: any) => Promise<void>;
  down: (queryInterface: any) => Promise<void>;
  timestamp: number;
  checksum?: string;
}

export interface MigrationMetadata {
  migrationName: string;
  appliedAt: Date;
  checksum: string;
}

export enum MigrationStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}
