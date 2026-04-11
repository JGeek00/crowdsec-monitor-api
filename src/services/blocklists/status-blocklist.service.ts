import type { Process, ProcessBlocklist, ProcessBlocklistIps, ProcessBlocklistRefresh, ProcessFieldBlocklist, ProcessFieldBlocklistOps } from '@/types/process.types';
import { PROCESS_BLOCKLIST_STEP, PROCESS_BLOCKLIST_FIELD_STATUS, PROCESS_FIELD_BLOCKLIST } from '@/types/process.types';
import { config } from '@/config';
import { type StatusService, statusService } from '@/services/status.service';

const PROCESS_RETENTION_MS = config.processes.finishedRetentionMs;

class StatusBlocklistService {
  constructor(private readonly statusService: StatusService) {}

  private get state() {
    return this.statusService.getStatusSnapshot();
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
    this.state.processes = [process, ...this.state.processes];
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
    this.state.processes = [process, ...this.state.processes];
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
    this.state.processes = [process, ...this.state.processes];
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
    this.state.processes = [process, ...this.state.processes];
    return id;
  }

  createBlocklistRefreshProcess(totalBlocklists: number): string {
    const id = crypto.randomUUID();
    const process: Process = {
      id,
      beginDatetime: new Date().toISOString(),
      endDatetime: null,
      successful: null,
      error: null,
      blocklistRefresh: { totalBlocklists, processedBlocklists: 0, successful: 0, failed: 0 },
    };
    this.state.processes = [process, ...this.state.processes];
    return id;
  }

  incrementRefreshBlocklist(id: string, successful: boolean): void {
    const p = this.state.processes.find(p => p.id === id);
    const rf = p?.blocklistRefresh as ProcessBlocklistRefresh | undefined;
    if (!rf) return;
    rf.processedBlocklists++;
    if (successful) rf.successful++;
    else rf.failed++;
  }

  // ─── Blocklist (import/enable) step updates ─────────────────────────────────

  markFetched(id: string, field: ProcessFieldBlocklist): void {
    const p = this.state.processes.find(p => p.id === id);
    const bl = p?.[field] as ProcessBlocklist | undefined;
    if (!bl) return;
    bl.fetched = PROCESS_BLOCKLIST_FIELD_STATUS.SUCCESSFUL;
    bl.parsed = PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING;
    bl.step = PROCESS_BLOCKLIST_STEP.PARSE;
  }

  markParsed(id: string, field: ProcessFieldBlocklist, totalIps: number): void {
    const p = this.state.processes.find(p => p.id === id);
    const bl = p?.[field] as ProcessBlocklist | undefined;
    if (!bl) return;
    bl.parsed = PROCESS_BLOCKLIST_FIELD_STATUS.SUCCESSFUL;
    bl.imported = PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING;
    bl.step = PROCESS_BLOCKLIST_STEP.IMPORT;
    bl.processIps.totalIps = totalIps;
  }

  addImportedIps(id: string, field: ProcessFieldBlocklist, count: number): void {
    const p = this.state.processes.find(p => p.id === id);
    const bl = p?.[field] as ProcessBlocklist | undefined;
    if (!bl) return;
    bl.processIps.processedIps += count;
  }

  markBlocklistOpComplete(id: string, field: ProcessFieldBlocklist): void {
    const p = this.state.processes.find(p => p.id === id);
    const bl = p?.[field] as ProcessBlocklist | undefined;
    if (!bl) return;
    bl.imported = PROCESS_BLOCKLIST_FIELD_STATUS.SUCCESSFUL;
    bl.processIps.processedIps = bl.processIps.totalIps;
  }

  // ─── Disable / Delete IP progress ───────────────────────────────────────────

  setIpsToDelete(id: string, field: ProcessFieldBlocklistOps, ipsToDelete: number): void {
    const p = this.state.processes.find(p => p.id === id);
    const bl = p?.[field] as ProcessBlocklistIps | undefined;
    if (!bl) return;
    bl.ipsToDelete = ipsToDelete;
  }

  setDeletedIps(id: string, field: ProcessFieldBlocklistOps, processedIps: number): void {
    const p = this.state.processes.find(p => p.id === id);
    const bl = p?.[field] as ProcessBlocklistIps | undefined;
    if (!bl) return;
    bl.processedIps = processedIps;
  }

  // ─── Process completion ──────────────────────────────────────────────────────

  completeProcess(id: string, successful: boolean, error: string | null = null): void {
    const snapshot = this.state;
    const p = snapshot.processes.find(p => p.id === id);
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
    const timer = setTimeout(() => {
      snapshot.processes = snapshot.processes.filter(p => p.id !== id);
    }, PROCESS_RETENTION_MS);
    timer.unref();
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  isBlocklistBusy(blocklistId: number): boolean {
    return this.state.processes.some(p => {
      if (p.endDatetime !== null) return false;
      return (
        p.blocklistImport?.blocklistId === blocklistId ||
        p.blocklistEnable?.blocklistId === blocklistId ||
        p.blocklistDisable?.blocklistId === blocklistId ||
        p.blocklistDelete?.blocklistId === blocklistId
      );
    });
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
