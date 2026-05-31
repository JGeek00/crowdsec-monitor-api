import type {
  Process,
  ProcessBlocklist,
  ProcessBlocklistIps,
  ProcessBlocklistRefresh,
  ProcessBlocklistRefreshEntry,
  ProcessBlocklistRefreshStep,
  ProcessBlocklistStepStatus,
  ProcessFieldBlocklist,
  ProcessFieldBlocklistOps,
} from '@/types/process.types';
import {
  PROCESS_BLOCKLIST_STEP,
  PROCESS_BLOCKLIST_FIELD_STATUS,
  PROCESS_BLOCKLIST_STEP_STATUS,
  PROCESS_FIELD_BLOCKLIST,
} from '@/types/process.types';
import { config } from '@/config';
import { type StatusService, statusService } from '@/services/status.service';

const PROCESS_RETENTION_MS = config.processes.finishedRetentionMs;

const INITIAL_STEPS: ProcessBlocklistRefreshEntry['steps'] = {
  fetch: PROCESS_BLOCKLIST_STEP_STATUS.PENDING,
  parse: PROCESS_BLOCKLIST_STEP_STATUS.PENDING,
  delete: PROCESS_BLOCKLIST_STEP_STATUS.PENDING,
  import: PROCESS_BLOCKLIST_STEP_STATUS.PENDING,
};

class StatusBlocklistService {
  private processes: Process[] = [];

  constructor(private readonly statusService: StatusService) {}

  // ─── Internal helpers ────────────────────────────────────────────────────────

  private findProcess(id: string): Process | undefined {
    return this.processes.find(p => p.id === id);
  }

  private syncAndNotify(): void {
    this.statusService.notifyChange();
  }

  // ─── Process creation ────────────────────────────────────────────────────────

  createBlocklistImportProcess(blocklistId: number, blocklistName: string): string {
    const id = crypto.randomUUID();
    const process: Process = {
      id,
      beginDatetime: new Date().toISOString(),
      endDatetime: null,
      successful: null,
      error: null,
      blocklistImport: this.initialProcessBlocklist(blocklistId, blocklistName),
    };
    this.processes = [process, ...this.processes];
    this.syncAndNotify();
    return id;
  }

  createBlocklistEnableProcess(blocklistId: number, blocklistName: string): string {
    const id = crypto.randomUUID();
    const process: Process = {
      id,
      beginDatetime: new Date().toISOString(),
      endDatetime: null,
      successful: null,
      error: null,
      blocklistEnable: this.initialProcessBlocklist(blocklistId, blocklistName),
    };
    this.processes = [process, ...this.processes];
    this.syncAndNotify();
    return id;
  }

  createBlocklistDisableProcess(blocklistIps: number, blocklistId: number, blocklistName: string): string {
    const id = crypto.randomUUID();
    const process: Process = {
      id,
      beginDatetime: new Date().toISOString(),
      endDatetime: null,
      successful: null,
      error: null,
      blocklistDisable: { blocklistId, blocklistName, blocklistIps, ipsToDelete: 0, processedIps: 0 },
    };
    this.processes = [process, ...this.processes];
    this.syncAndNotify();
    return id;
  }

  createBlocklistDeleteProcess(blocklistIps: number, blocklistId: number, blocklistName: string): string {
    const id = crypto.randomUUID();
    const process: Process = {
      id,
      beginDatetime: new Date().toISOString(),
      endDatetime: null,
      successful: null,
      error: null,
      blocklistDelete: { blocklistId, blocklistName, blocklistIps, ipsToDelete: 0, processedIps: 0 },
    };
    this.processes = [process, ...this.processes];
    this.syncAndNotify();
    return id;
  }

  createBlocklistRefreshProcess(blocklists: { number: number; name: string }[]): string {
    const id = crypto.randomUUID();
    const blocklistEntries: ProcessBlocklistRefreshEntry[] = blocklists.map(bl => ({
      number: bl.number,
      name: bl.name,
      steps: { ...INITIAL_STEPS },
    }));
    const process: Process = {
      id,
      beginDatetime: new Date().toISOString(),
      endDatetime: null,
      successful: null,
      error: null,
      blocklistRefresh: {
        totalBlocklists: blocklists.length,
        currentBlocklist: 0,
        blocklists: blocklistEntries,
        totalIps: 0,
      },
    };
    this.processes = [process, ...this.processes];
    this.syncAndNotify();
    return id;
  }

  setCurrentBlocklist(id: string, index: number): void {
    const p = this.findProcess(id);
    const rf = p?.blocklistRefresh as ProcessBlocklistRefresh | undefined;
    if (!rf) return;
    rf.currentBlocklist = index;
    this.syncAndNotify();
  }

  setBlocklistStepStatus(
    id: string,
    blocklistIndex: number,
    step: ProcessBlocklistRefreshStep,
    status: ProcessBlocklistStepStatus,
  ): void {
    const p = this.findProcess(id);
    const rf = p?.blocklistRefresh as ProcessBlocklistRefresh | undefined;
    if (!rf) return;
    const entry = rf.blocklists[blocklistIndex];
    if (!entry) return;
    entry.steps[step] = status;
    this.syncAndNotify();
  }

  addBlocklistIps(id: string, count: number): void {
    const p = this.findProcess(id);
    const rf = p?.blocklistRefresh as ProcessBlocklistRefresh | undefined;
    if (!rf) return;
    rf.totalIps += count;
    this.syncAndNotify();
  }

  // ─── Blocklist (import/enable) step updates ─────────────────────────────────

  markFetched(id: string, field: ProcessFieldBlocklist): void {
    const p = this.findProcess(id);
    const bl = p?.[field] as ProcessBlocklist | undefined;
    if (!bl) return;
    bl.fetched = PROCESS_BLOCKLIST_FIELD_STATUS.SUCCESSFUL;
    bl.parsed = PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING;
    bl.step = PROCESS_BLOCKLIST_STEP.PARSE;
    this.syncAndNotify();
  }

  markParsed(id: string, field: ProcessFieldBlocklist, totalIps: number): void {
    const p = this.findProcess(id);
    const bl = p?.[field] as ProcessBlocklist | undefined;
    if (!bl) return;
    bl.parsed = PROCESS_BLOCKLIST_FIELD_STATUS.SUCCESSFUL;
    bl.imported = PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING;
    bl.step = PROCESS_BLOCKLIST_STEP.IMPORT;
    bl.processIps.totalIps = totalIps;
    this.syncAndNotify();
  }

  addImportedIps(id: string, field: ProcessFieldBlocklist, count: number): void {
    const p = this.findProcess(id);
    const bl = p?.[field] as ProcessBlocklist | undefined;
    if (!bl) return;
    bl.processIps.processedIps += count;
    this.syncAndNotify();
  }

  markBlocklistOpComplete(id: string, field: ProcessFieldBlocklist): void {
    const p = this.findProcess(id);
    const bl = p?.[field] as ProcessBlocklist | undefined;
    if (!bl) return;
    bl.imported = PROCESS_BLOCKLIST_FIELD_STATUS.SUCCESSFUL;
    bl.processIps.processedIps = bl.processIps.totalIps;
    this.syncAndNotify();
  }

  // ─── Disable / Delete IP progress ───────────────────────────────────────────

  setIpsToDelete(id: string, field: ProcessFieldBlocklistOps, ipsToDelete: number): void {
    const p = this.findProcess(id);
    const bl = p?.[field] as ProcessBlocklistIps | undefined;
    if (!bl) return;
    bl.ipsToDelete = ipsToDelete;
    this.syncAndNotify();
  }

  setDeletedIps(id: string, field: ProcessFieldBlocklistOps, processedIps: number): void {
    const p = this.findProcess(id);
    const bl = p?.[field] as ProcessBlocklistIps | undefined;
    if (!bl) return;
    bl.processedIps = processedIps;
    this.syncAndNotify();
  }

  // ─── Process completion ──────────────────────────────────────────────────────

  completeProcess(id: string, successful: boolean, error: string | null = null): void {
    const p = this.findProcess(id);
    if (!p) return;
    p.endDatetime = new Date().toISOString();
    p.successful = successful;
    p.error = error;
    if (!successful) {
      for (const field of Object.values(PROCESS_FIELD_BLOCKLIST) as ProcessFieldBlocklist[]) {
        const bl = p[field] as ProcessBlocklist | undefined;
        if (!bl) continue;
        if (bl.fetched === PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING) bl.fetched = PROCESS_BLOCKLIST_FIELD_STATUS.FAILED;
        if (bl.parsed === PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING) bl.parsed = PROCESS_BLOCKLIST_FIELD_STATUS.FAILED;
        if (bl.imported === PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING) bl.imported = PROCESS_BLOCKLIST_FIELD_STATUS.FAILED;
      }
    }
    this.syncAndNotify();
    const timer = setTimeout(() => {
      this.processes = this.processes.filter(p => p.id !== id);
      this.syncAndNotify();
    }, PROCESS_RETENTION_MS);
    timer.unref();
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  isBlocklistBusy(blocklistId: number): boolean {
    return this.processes.some(p => {
      if (p.endDatetime !== null) return false;
      return (
        p.blocklistImport?.blocklistId === blocklistId ||
        p.blocklistEnable?.blocklistId === blocklistId ||
        p.blocklistDisable?.blocklistId === blocklistId ||
        p.blocklistDelete?.blocklistId === blocklistId
      );
    });
  }

  isSyncingBlocklists(): boolean {
    return this.processes.some(p => p.endDatetime === null && p.blocklistRefresh !== undefined);
  }

  /** Returns a deep-cloned snapshot of processes for safe serialization (no proxy involvement). */
  getProcessesSnapshot(): Process[] {
    return JSON.parse(JSON.stringify(this.processes));
  }

  /** Finds a process by id. */
  getProcessById(id: string): Process | undefined {
    return this.processes.find(p => p.id === id);
  }

  // ─── Internals ───────────────────────────────────────────────────────────────

  private initialProcessBlocklist(blocklistId: number, blocklistName: string): ProcessBlocklist {
    return {
      blocklistId,
      blocklistName,
      step: PROCESS_BLOCKLIST_STEP.FETCH,
      fetched: PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING,
      parsed: PROCESS_BLOCKLIST_FIELD_STATUS.PENDING,
      imported: PROCESS_BLOCKLIST_FIELD_STATUS.PENDING,
      processIps: { totalIps: 0, processedIps: 0 },
    };
  }
}

export const statusBlocklistService = new StatusBlocklistService(statusService);
