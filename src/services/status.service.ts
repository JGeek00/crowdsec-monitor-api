import { StatusSnapshot } from '@/models';
import { makeReactive } from '@/utils/make-reactive';
import packageJson from '../../package.json';

export class StatusService {
  private onStateChange: (() => void) | null = null;
  private broadcastPending = false;
  private readonly state: StatusSnapshot = makeReactive(
    {
      csLapi: {
        lapiConnected: false,
        lastSuccessfulSync: null,
        timestamp: new Date().toISOString(),
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

  updateLapiStatus(lapiConnected: boolean, lastSuccessfulSync: string | null): void {
    this.state.csLapi.lapiConnected = lapiConnected;
    this.state.csLapi.lastSuccessfulSync = lastSuccessfulSync;
    this.state.csLapi.timestamp = new Date().toISOString();
  }

  updateBouncerStatus(available: boolean): void {
    this.state.csBouncer.available = available;
  }

  updateVersionInfo(newVersionAvailable: string | null): void {
    this.state.csMonitorApi.newVersionAvailable = newVersionAvailable;
  }

  setProcesses(processes: import('@/types/process.types').Process[]): void {
    this.state.processes = processes;
  }

  getStatusSnapshot(): StatusSnapshot {
    return this.state;
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
