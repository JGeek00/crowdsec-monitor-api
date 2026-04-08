import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage, Server } from 'http';
import type { Process, ProcessBlocklist, ProcessBlocklistIps, ProcessBlocklistProgress, ProcessBlocklistRefresh, ProcessFieldBlocklist, ProcessFieldBlocklistOps } from '@/types/process.types';
import { PROCESS_BLOCKLIST_STEP, PROCESS_BLOCKLIST_FIELD_STATUS, PROCESS_FIELD_BLOCKLIST } from '@/types/process.types';
import { config } from '@/config';

const PROCESS_RETENTION_MS = config.processes.finishedRetentionMs;

class ProcessTrackingService {
  private processes: Map<string, Process> = new Map();
  private wsClients: Set<WebSocket> = new Set();

  // ─── WebSocket setup ────────────────────────────────────────────────────────

  setupWebSocket(server: Server, path: string = '/api/v1/processes/ws'): void {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req: IncomingMessage, socket, head) => {
      const url = req.url?.split('?')[0];
      if (url !== path) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    });

    // Heartbeat: ping every 30s, terminate clients that don't respond
    const heartbeatInterval = setInterval(() => {
      for (const ws of this.wsClients) {
        if ((ws as WebSocket & { isAlive?: boolean }).isAlive === false) {
          this.wsClients.delete(ws);
          ws.terminate();
          return;
        }
        (ws as WebSocket & { isAlive?: boolean }).isAlive = false;
        ws.ping();
      }
    }, 30_000);
    heartbeatInterval.unref();

    wss.on('connection', (ws: WebSocket) => {
      (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
      ws.on('pong', () => { (ws as WebSocket & { isAlive?: boolean }).isAlive = true; });
      this.wsClients.add(ws);
      // Send current snapshot immediately on connect
      ws.send(JSON.stringify(this.getVisibleProcesses()));
      ws.on('close', () => this.wsClients.delete(ws));
      ws.on('error', () => this.wsClients.delete(ws));
    });
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  createBlocklistImportProcess(): string {
    const id = crypto.randomUUID();
    const process: Process = {
      id,
      beginDatetime: new Date().toISOString(),
      endDatetime: null,
      successful: null,
      blocklistImport: this.initialProcessBlocklist(),
    };
    this.processes.set(id, process);
    this.broadcast();
    return id;
  }

  createBlocklistEnableProcess(): string {
    const id = crypto.randomUUID();
    const process: Process = {
      id,
      beginDatetime: new Date().toISOString(),
      endDatetime: null,
      successful: null,
      blocklistEnable: this.initialProcessBlocklist(),
    };
    this.processes.set(id, process);
    this.broadcast();
    return id;
  }

  createBlocklistDisableProcess(blocklistIps: number): string {
    const id = crypto.randomUUID();
    const process: Process = {
      id,
      beginDatetime: new Date().toISOString(),
      endDatetime: null,
      successful: null,
      blocklistDisable: { blocklistIps, ipsToDelete: 0, processedIps: 0 },
    };
    this.processes.set(id, process);
    this.broadcast();
    return id;
  }

  createBlocklistDeleteProcess(blocklistIps: number): string {
    const id = crypto.randomUUID();
    const process: Process = {
      id,
      beginDatetime: new Date().toISOString(),
      endDatetime: null,
      successful: null,
      blocklistDelete: { blocklistIps, ipsToDelete: 0, processedIps: 0 },
    };
    this.processes.set(id, process);
    this.broadcast();
    return id;
  }

  createBlocklistRefreshProcess(totalBlocklists: number): string {
    const id = crypto.randomUUID();
    const process: Process = {
      id,
      beginDatetime: new Date().toISOString(),
      endDatetime: null,
      successful: null,
      blocklistRefresh: { totalBlocklists, processedBlocklists: 0, successful: 0, failed: 0 },
    };
    this.processes.set(id, process);
    this.broadcast();
    return id;
  }

  incrementRefreshBlocklist(id: string, successful: boolean): void {
    const p = this.processes.get(id);
    const rf = p?.blocklistRefresh as ProcessBlocklistRefresh | undefined;
    if (!rf) return;
    rf.processedBlocklists++;
    if (successful) rf.successful++;
    else rf.failed++;
    this.broadcast();
  }

  // ─── Blocklist (import/enable) step updates ─────────────────────────────────

  markFetched(id: string, field: ProcessFieldBlocklist): void {
    const p = this.processes.get(id);
    const bl = p?.[field] as ProcessBlocklist | undefined;
    if (!bl) return;
    bl.fetched = PROCESS_BLOCKLIST_FIELD_STATUS.SUCCESSFUL;
    bl.parsed = PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING;
    bl.step = PROCESS_BLOCKLIST_STEP.PARSE;
    this.broadcast();
  }

  markParsed(id: string, field: ProcessFieldBlocklist, totalIps: number): void {
    const p = this.processes.get(id);
    const bl = p?.[field] as ProcessBlocklist | undefined;
    if (!bl) return;
    bl.parsed = PROCESS_BLOCKLIST_FIELD_STATUS.SUCCESSFUL;
    bl.imported = PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING;
    bl.step = PROCESS_BLOCKLIST_STEP.IMPORT;
    bl.processIps.totalIps = totalIps;
    this.broadcast();
  }

  addImportedIps(id: string, field: ProcessFieldBlocklist, count: number): void {
    const p = this.processes.get(id);
    const bl = p?.[field] as ProcessBlocklist | undefined;
    if (!bl) return;
    bl.processIps.processedIps += count;
    this.broadcast();
  }

  markBlocklistOpComplete(id: string, field: ProcessFieldBlocklist): void {
    const p = this.processes.get(id);
    const bl = p?.[field] as ProcessBlocklist | undefined;
    if (!bl) return;
    bl.imported = PROCESS_BLOCKLIST_FIELD_STATUS.SUCCESSFUL;
    bl.processIps.processedIps = bl.processIps.totalIps;
    this.broadcast();
  }

  // ─── Disable / Delete IP progress ───────────────────────────────────────────

  setIpsToDelete(id: string, field: ProcessFieldBlocklistOps, ipsToDelete: number): void {
    const p = this.processes.get(id);
    const bl = p?.[field] as ProcessBlocklistIps | undefined;
    if (!bl) return;
    bl.ipsToDelete = ipsToDelete;
    this.broadcast();
  }

  setDeletedIps(id: string, field: ProcessFieldBlocklistOps, processedIps: number): void {
    const p = this.processes.get(id);
    const bl = p?.[field] as ProcessBlocklistIps | undefined;
    if (!bl) return;
    bl.processedIps = processedIps;
    this.broadcast();
  }

  // ─── Process completion ──────────────────────────────────────────────────────

  completeProcess(id: string, successful: boolean): void {
    const p = this.processes.get(id);
    if (!p) return;
    p.endDatetime = new Date().toISOString();
    p.successful = successful;
    if (!successful) {
      for (const field of Object.values(PROCESS_FIELD_BLOCKLIST) as ProcessFieldBlocklist[]) {
        const bl = p[field] as ProcessBlocklist | undefined;
        if (!bl) continue;
        if (bl.fetched === PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING) bl.fetched = PROCESS_BLOCKLIST_FIELD_STATUS.FAILED;
        if (bl.parsed === PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING) bl.parsed = PROCESS_BLOCKLIST_FIELD_STATUS.FAILED;
        if (bl.imported === PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING) bl.imported = PROCESS_BLOCKLIST_FIELD_STATUS.FAILED;
      }
    }
    this.broadcast();
    const timer = setTimeout(() => this.processes.delete(id), PROCESS_RETENTION_MS);
    timer.unref();
  }

  // ─── Query ───────────────────────────────────────────────────────────────────

  getVisibleProcesses(): Process[] {
    return [...this.processes.values()];
  }

  // ─── Internals ───────────────────────────────────────────────────────────────

  private initialProcessBlocklist(): ProcessBlocklist {
    return {
      step: PROCESS_BLOCKLIST_STEP.FETCH,
      fetched: PROCESS_BLOCKLIST_FIELD_STATUS.RUNNING,
      parsed: PROCESS_BLOCKLIST_FIELD_STATUS.PENDING,
      imported: PROCESS_BLOCKLIST_FIELD_STATUS.PENDING,
      processIps: { totalIps: 0, processedIps: 0 },
    };
  }

  private broadcast(): void {
    if (this.wsClients.size === 0) return;
    const payload = JSON.stringify(this.getVisibleProcesses());
    for (const ws of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}

export const processTrackingService = new ProcessTrackingService();
