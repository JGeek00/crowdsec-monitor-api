/** Live operational status snapshot served over HTTP and pushed over WebSocket. */
export interface StatusSnapshot {
  lapi: {
    connected: boolean;
    lastSuccessfulSync: string | null;
    lastError: string | null;
  };
  bouncer: {
    connected: boolean;
  };
  version: {
    currentVersion: string;
    latestVersion: string | null;
    newVersionAvailable: boolean;
    releaseUrl: string | null;
  };
}

// Implemented by: infrastructure/status/memory-status-store.ts
// Called by: application/use-cases/status/*, application/jobs/*, delivery/websocket/channels/status.channel.ts
export interface StatusStore {
  getSnapshot(): StatusSnapshot;
  updateLapi(connected: boolean, lastSuccessfulSync: string | null, lastError?: string | null): void;
  updateBouncer(connected: boolean): void;
  updateVersion(info: Partial<StatusSnapshot['version']>): void;
  /** Push channel: the only way the WS gateway learns about state changes. */
  subscribe(fn: (snapshot: StatusSnapshot) => void): () => void;
}
