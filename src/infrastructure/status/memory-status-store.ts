import type { StatusSnapshot } from '@/shared/models';
import { toCanonicalTimestamp, toCanonicalTimestampFromDate } from '@/utils/timestamp-format';
import packageJson from '../../../package.json';

type StateChangeCallback = () => void;

/**
 * In-memory implementation of the StatusStore port (application layer owns
 * the shape; this store owns reactivity). No circular imports: process
 * tracking lives in MemoryProcessTracker and the HTTP/WS presenters compose
 * both. `subscribe()` is the only push channel.
 */
export class MemoryStatusStore {
  private readonly callbacks: StateChangeCallback[] = [];
  private broadcastPending = false;

  private readonly state: {
    csLapi: { lapiConnected: boolean; lastSuccessfulSync: string | null; timestamp: string };
    csBouncer: { available: boolean };
    csMonitorApi: { version: string; newVersionAvailable: string | null };
  } = {
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
  };

  getSnapshot(): StatusSnapshot {
    return {
      csLapi: this.state.csLapi,
      csBouncer: this.state.csBouncer,
      csMonitorApi: this.state.csMonitorApi,
      processes: [],
    };
  }

  updateLapi(lapiConnected: boolean, lastSuccessfulSync: string | null): void {
    this.state.csLapi.lapiConnected = lapiConnected;
    // lastSuccessfulSync arrives as RFC 3339 from the sync service; deliver canonical
    this.state.csLapi.lastSuccessfulSync = lastSuccessfulSync ? toCanonicalTimestamp(lastSuccessfulSync) : null;
    this.state.csLapi.timestamp = toCanonicalTimestampFromDate(new Date());
    this.notifyChange();
  }

  updateBouncer(available: boolean): void {
    this.state.csBouncer.available = available;
    this.notifyChange();
  }

  updateVersion(newVersionAvailable: string | null): void {
    this.state.csMonitorApi.newVersionAvailable = newVersionAvailable;
    this.notifyChange();
  }

  subscribe(fn: StateChangeCallback): () => void {
    this.callbacks.push(fn);
    return () => {
      const idx = this.callbacks.indexOf(fn);
      if (idx !== -1) this.callbacks.splice(idx, 1);
    };
  }

  /** Debounced change notification (same queueMicrotask cadence as legacy). */
  notifyChange(): void {
    if (this.broadcastPending) return;
    this.broadcastPending = true;
    queueMicrotask(() => {
      this.broadcastPending = false;
      for (const fn of this.callbacks) fn();
    });
  }
}

export const memoryStatusStore = new MemoryStatusStore();
