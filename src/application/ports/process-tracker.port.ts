/** One step of a blocklist refresh pipeline (fetch → parse → delete → import). */
export interface ProcessStep {
  step: 'fetch' | 'parse' | 'delete' | 'import';
  ok: boolean;
  detail: string | null;
}

// Implemented by: infrastructure/status/memory-process-tracker.ts
// Called by: application/use-cases/blocklists/*, application/jobs/refresh-blocklists.job.ts
export interface ProcessTrackerPort {
  start(kind: string, payload: Record<string, unknown>): string;
  markFetched(processId: string, ok: boolean, detail?: string | null): void;
  markParsed(processId: string, ok: boolean, detail?: string | null): void;
  addImportedIps(processId: string, count: number): void;
  markComplete(processId: string, ok: boolean, detail?: string | null): void;
  completeProcess(processId: string): void;
  getSnapshot(): unknown[];
  isSyncingBlocklists(): boolean;
}
