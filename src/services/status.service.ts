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

  getStatusSnapshot(): StatusSnapshot {
    return this.state;
  }

  /**
   * Returns a clean snapshot for serialization (HTTP/WebSocket).
   * Processes come from StatusBlocklistService via deep clone — zero proxy involvement.
   * Lazy-require avoids circular dependency with StatusBlocklistService.
   */
  getCleanSnapshot(): StatusSnapshot {
    const { statusBlocklistService } = require('./blocklists/status-blocklist.service') as {
      statusBlocklistService: { getProcessesSnapshot(): import('@/types/process.types').Process[] };
    };
    return {
      csLapi: this.state.csLapi,
      csBouncer: this.state.csBouncer,
      csMonitorApi: this.state.csMonitorApi,
      processes: statusBlocklistService.getProcessesSnapshot(),
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
