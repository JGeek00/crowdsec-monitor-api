import type { LapiClient } from '@/application/ports/lapi-client.port';
import { lookupIpsInBlocklists } from '@/utils/blocklist-lookup';
import { lookupIpsInAllowlists } from '@/utils/allowlist-lookup';
import { resolveIps } from '@/utils/dns-resolve';
import { config } from '@/config';

export interface CheckIpResultItem {
  ip: string;
  blocklists: string[];
}

// Called by: delivery/http controllers (blocklists check endpoint)
export class CheckIpUseCase {
  constructor(private readonly deps: { lapiClient: LapiClient }) {}

  async execute(ips: string[]): Promise<{ results: CheckIpResultItem[] }> {
    const blocklistMap = await lookupIpsInBlocklists(ips);
    const results = ips.map((ip) => ({ ip, blocklists: blocklistMap.get(ip) ?? [] }));
    return { results };
  }
}

export interface CheckDomainResult {
  domain: string;
  ips: { ip: string; blocklists: string[] }[];
}

// Called by: delivery/http controllers (blocklists check-domain endpoint)
export class CheckDomainUseCase {
  constructor(private readonly deps: { lapiClient: LapiClient }) {}

  async execute(domain: string): Promise<CheckDomainResult | { unresolvable: true }> {
    const ips = await resolveIps(domain, config.dns.server);

    if (ips.length === 0) {
      return { unresolvable: true };
    }

    const blocklistMap = await lookupIpsInBlocklists(ips);
    const results = ips.map((ip) => ({ ip, blocklists: blocklistMap.get(ip) ?? [] }));
    return { domain, ips: results };
  }
}

// Called by: delivery/http controllers (lists check-ips endpoint)
export class CheckIpsInListUseCase {
  constructor(private readonly deps: { lapiClient: LapiClient }) {}

  async execute(ips: string[]): Promise<unknown> {
    const [blocklistMap, allowlistMap] = await Promise.all([lookupIpsInBlocklists(ips), lookupIpsInAllowlists(ips)]);

    return {
      results: ips.map((ip) => ({
        ip,
        blocklists: blocklistMap.get(ip) ?? [],
        allowlists: allowlistMap.get(ip) ?? [],
      })),
    };
  }
}

// Called by: delivery/http controllers (allowlists check endpoint)
export class CheckAllowlistUseCase {
  constructor(private readonly deps: { lapiClient: LapiClient }) {}

  execute(ips: string[]): Promise<unknown> {
    return this.deps.lapiClient.checkAllowlist(ips);
  }
}
