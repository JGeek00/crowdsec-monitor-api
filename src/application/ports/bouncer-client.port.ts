// Implemented by: infrastructure/crowdsec/http-bouncer-client.ts
// Called by: application/use-cases/blocklists/*, application/use-cases/status/*
export interface BouncerClient {
  /** Verifies the bouncer API key (request active decisions). */
  check(): Promise<boolean>;
  isBouncerConnected(): boolean;
  getActiveDecisions(): Promise<Set<string>>;
  /** Pushes IPs to CrowdSec in chunks of BLOCKLISTS_WRITE_CHUNK_SIZE. */
  pushIps(ips: string[], name: string, onChunk?: (pushed: number) => void): Promise<number>;
  /** Deletes the CrowdSec alert(s) that import a blocklist, so it can be re-imported. */
  deleteBlocklistAlerts(name: string, onProgress?: (deleted: number) => void): Promise<void>;
  /** Downloads a blocklist file (SSRF-checked URL). */
  download(url: string): Promise<string>;
}
