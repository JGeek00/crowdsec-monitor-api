import type { LapiClient } from '@/application/ports/lapi-client.port';
import type { AllowlistIpLookup, BlocklistIpLookup, DomainResolver } from '@/application/ports/ip-lookup.port';
import { resolveIps } from '@/shared/utils/dns-resolve';
import { config } from '@/config';

export interface CheckIpResultItem {
  ip: string;
  blocklists: string[];
}

// Called by: delivery/http controllers (blocklists check endpoint)
export class CheckIpUseCase {
  constructor(private readonly deps: { blocklistLookup: BlocklistIpLookup }) {}

  async execute(ips: string[]): Promise<{ results: CheckIpResultItem[] }> {
    const blocklistMap = await this.deps.blocklistLookup(ips);
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
  constructor(private readonly deps: { blocklistLookup: BlocklistIpLookup; resolveDomain: DomainResolver }) {}

  async execute(domain: string): Promise<CheckDomainResult | { unresolvable: true }> {
    const ips = await this.deps.resolveDomain(domain, config.dns.server);

    if (ips.length === 0) {
      return { unresolvable: true };
    }

    const blocklistMap = await this.deps.blocklistLookup(ips);
    const results = ips.map((ip) => ({ ip, blocklists: blocklistMap.get(ip) ?? [] }));
    return { domain, ips: results };
  }
}

// Called by: delivery/http controllers (lists check-ips endpoint)
export class CheckIpsInListUseCase {
  constructor(private readonly deps: { blocklistLookup: BlocklistIpLookup; allowlistLookup: AllowlistIpLookup }) {}

  async execute(ips: string[]): Promise<unknown> {
    const [blocklistMap, allowlistMap] = await Promise.all([
      this.deps.blocklistLookup(ips),
      this.deps.allowlistLookup(ips),
    ]);

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

// Re-exported for the composition root's convenience wiring.
export { resolveIps };
