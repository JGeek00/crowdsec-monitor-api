import type { Process } from '@/shared/process.types';

/** One step of a blocklist refresh pipeline (fetch → parse → delete → import). */
export interface ProcessStep {
  step: 'fetch' | 'parse' | 'delete' | 'import';
  ok: boolean;
  detail: string | null;
}

// Implemented by: infrastructure/status/memory-process-tracker.ts
// Called by: application/use-cases/blocklists/*, application/jobs/refresh-blocklists.job
// Note: the fetch/parse/import step marks are still driven by the infra
// refresh pipeline directly; they move behind this port when the
// orchestration is rewritten (feature Log debt (a)).
export interface ProcessTrackerPort {
  createBlocklistImportProcess(blocklistId: number, blocklistName: string): string;
  createBlocklistEnableProcess(blocklistId: number, blocklistName: string): string;
  createBlocklistSingleRefreshProcess(blocklistId: number, blocklistName: string): string;
  createBlocklistDisableProcess(blocklistIps: number, blocklistId: number, blocklistName: string): string;
  createBlocklistDeleteProcess(blocklistIps: number, blocklistId: number, blocklistName: string): string;
  createBlocklistRefreshProcess(blocklists: { number: number; name: string }[]): string;
  completeProcess(id: string, successful: boolean, error?: string | null): void;
  getProcessesSnapshot(): Process[];
  isBlocklistBusy(blocklistId: number): boolean;
  isSyncingBlocklists(): boolean;
  isAnyBlocklistProcessRunning(): boolean;
}
