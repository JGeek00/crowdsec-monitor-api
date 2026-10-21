// Implemented by: infrastructure/crowdsec/allowlist-provider.ts
// Called by: application/use-cases/allowlists/check-allowlist
export interface AllowlistProvider {
  /** Returns the current allowlist entries (community + user) as matcher input. */
  getEntries(): Promise<string[]>;
}

// Implemented by: infrastructure/crowdsec/blocklist-source.ts
// Called by: application/use-cases/blocklists/refresh-blocklist
export interface BlocklistSource {
  /** Fetches raw blocklist content (line-based) from its public URL. */
  download(url: string): Promise<string>;
}
