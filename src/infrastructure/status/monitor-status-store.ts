import type { StatusSnapshot } from '@/shared/models';
import type { Process } from '@/shared/process.types';
import { makeReactive } from '@/infrastructure/status/make-reactive';
import { toCanonicalTimestamp, toCanonicalTimestampFromDate } from '@/shared/utils/timestamp-format';
import packageJson from '../../../package.json';

export class StatusService {
  private onStateChange: (() => void) | null = null;
  private processSnapshotProvider: (() => Process[]) | null = null;
  private broadcastPending = false;
  private readonly state: StatusSnapshot = makeReactive(
    {
      csLapi: {
        lapiConnected: false,
        lastSuccessfulSync: null,
        timestamp: toCanonicalTimestampFromDate(new Date()),
      },
      csBouncer: { available: false },
      csMonitorApi: {
        version: packageJson.version,
        newVersionAvailable: null,
      },
      processes: [],
    },
    () => this.scheduleBroadcast(),
  );

  registerStateChangeCallback(fn: () => void): void {
    this.onStateChange = fn;
  }

  /**
   * Composition-root wiring: the process snapshot comes from the tracker
   * without a module-level dependency (breaks the store↔tracker cycle).
   */
  setProcessSnapshotProvider(fn: () => Process[]): void {
    this.processSnapshotProvider = fn;
  }

  updateLapiStatus(lapiConnected: boolean, lastSuccessfulSync: string | null): void {
    this.state.csLapi.lapiConnected = lapiConnected;
    // lastSuccessfulSync arrives as RFC 3339 from the sync service; deliver canonical
    this.state.csLapi.lastSuccessfulSync = lastSuccessfulSync ? toCanonicalTimestamp(lastSuccessfulSync) : null;
    this.state.csLapi.timestamp = toCanonicalTimestampFromDate(new Date());
  }

  updateBouncerStatus(available: boolean): void {
    this.state.csBouncer.available = available;
  }

  updateVersionInfo(newVersionAvailable: string | null): void {
    this.state.csMonitorApi.newVersionAvailable = newVersionAvailable;
  }

  getStatusSnapshot(): StatusSnapshot {
    return this.state;
  }

  /**
   * Returns a clean snapshot for serialization (HTTP/WebSocket).
   * Processes come from the process tracker via the provider wired by the
   * composition root — zero proxy involvement, no circular require.
   */
  getCleanSnapshot(): StatusSnapshot {
    return {
      csLapi: this.state.csLapi,
      csBouncer: this.state.csBouncer,
      csMonitorApi: this.state.csMonitorApi,
      processes: this.processSnapshotProvider?.() ?? [],
    };
  }

  /**
   * Explicit notification for services that manage their own state
   * (e.g., StatusBlocklistService). Triggers a debounced broadcast.
   */
  notifyChange(): void {
    this.scheduleBroadcast();
  }

  private scheduleBroadcast(): void {
    if (this.broadcastPending) return;
    this.broadcastPending = true;
    queueMicrotask(() => {
      this.broadcastPending = false;
      this.onStateChange?.();
    });
  }
}

export const statusService = new StatusService();
