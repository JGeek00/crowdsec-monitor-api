import packageJson from '../../package.json';
import { StatusSnapshot } from '@/interfaces/status.interface';
import { makeReactive } from '@/utils/make-reactive';

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

  getStatusSnapshot(): StatusSnapshot {
    return this.state;
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
