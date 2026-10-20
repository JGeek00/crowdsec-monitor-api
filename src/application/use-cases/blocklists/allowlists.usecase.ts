import { isValidDate } from '@/shared/utils/date-validator';
import { toCanonicalTimestamp } from '@/shared/utils/timestamp-format';
import { NotFoundError } from '@/domain/errors';
import type { CrowdSecAllowlist } from '@/shared/crowdsec.types';
import type { LapiClient } from '@/application/ports/lapi-client.port';

/** Renders timestamps canonically; invalid expirations become null (legacy sanitize). */
function sanitizeAllowlist(allowlist: CrowdSecAllowlist): CrowdSecAllowlist {
  return {
    ...allowlist,
    created_at: toCanonicalTimestamp(allowlist.created_at) ?? allowlist.created_at,
    updated_at: toCanonicalTimestamp(allowlist.updated_at) ?? allowlist.updated_at,
    items: allowlist.items.map((item) => ({
      ...item,
      created_at: toCanonicalTimestamp(item.created_at) ?? item.created_at,
      expiration: isValidDate(item.expiration) ? toCanonicalTimestamp(item.expiration) : null,
    })),
  };
}

function sanitizeAllowlists(allowlists: CrowdSecAllowlist[]): CrowdSecAllowlist[] {
  return allowlists.map((allowlist) => ({
    ...allowlist,
    items: allowlist.items.map((item) => ({
      ...item,
      expiration: isValidDate(item.expiration) ? toCanonicalTimestamp(item.expiration) : null,
    })),
  }));
}

// Called by: delivery/http controllers (allowlists list endpoint)
export class ListAllowlistsUseCase {
  constructor(private readonly deps: { lapiClient: LapiClient }) {}

  async execute(): Promise<{ data: CrowdSecAllowlist[]; length: number }> {
    const allowlists = await this.deps.lapiClient.getAllowlists();
    const sanitizedAllowlists = sanitizeAllowlists(allowlists);
    return { data: sanitizedAllowlists, length: sanitizedAllowlists.length };
  }
}

// Called by: delivery/http controllers (allowlists detail endpoint)
export class GetAllowlistUseCase {
  constructor(private readonly deps: { lapiClient: LapiClient }) {}

  async execute(name: string): Promise<CrowdSecAllowlist> {
    const allowlist = await this.deps.lapiClient.getAllowlistByName(name);
    if (!allowlist) {
      throw new NotFoundError(`Allowlist '${name}' was not found`);
    }
    return sanitizeAllowlist(allowlist);
  }
}
