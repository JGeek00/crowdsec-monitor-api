import { buildAllowlistMatcher } from '@/utils/ip';
import { log } from '@/services/log.service';

/** Remove IPs that match any allowlist entry. */
export function filterAllowlistedIps(ips: string[], name: string, entries: string[]): string[] {
  const isAllowlisted = buildAllowlistMatcher(entries);
  const filtered = ips.filter((ip) => !isAllowlisted(ip));
  const skipped = ips.length - filtered.length;

  if (skipped > 0) {
    log.debug(`  Allowlist filtering "${name}": ${skipped} skipped (${entries.length} allowlist entries)`);
  }

  return filtered;
}
