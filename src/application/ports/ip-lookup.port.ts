/** Lookup of blocklist IPs matching the given IPs (DB-backed in infrastructure). */
export type BlocklistIpLookup = (ips: string[]) => Promise<Map<string, string[]>>;

/** Lookup of allowlist entries covering the given IPs (CrowdSec-backed in infrastructure). */
export type AllowlistIpLookup = (ips: string[]) => Promise<Map<string, string[]>>;

/** Resolves a domain name to IPs (DNS in shared/utils, injected for tests). */
export type DomainResolver = (domain: string, server: string) => Promise<string[]>;
