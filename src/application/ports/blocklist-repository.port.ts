import type { Blocklist } from '@/domain/entities/blocklist.entity';
import type { BlocklistIp } from '@/domain/entities/blocklist-ip.entity';
import type { CsBlocklist } from '@/domain/entities/cs-blocklist.entity';

/** Refresh pipeline outcome per stage (fetch → parse → delete → import). */
export interface RefreshOutcome {
  imported: number;
  deleted: number;
  errors: {
    fetch: number;
    parse: number;
    delete: number;
    import: number;
  };
}

export interface BlocklistWithIps extends Blocklist {
  ips: BlocklistIp[];
}

/** A persistence row exposing its plain object (Sequelize models satisfy this structurally). */
export interface BlocklistRow {
  toJSON(): Record<string, unknown>;
}

/** Merged-list item after canonicalization (dynamic delivered shape). */
export type BlocklistListItem = Record<string, unknown>;

export interface BlocklistListPagination {
  page: number;
  amount: number;
  total: number;
}

export type BlocklistListResult =
  { total: number; items: BlocklistListItem[] } | { items: BlocklistListItem[]; pagination: BlocklistListPagination };

export interface BlocklistIpsResult {
  items: BlocklistListItem[];
  total?: number;
  pagination?: BlocklistListPagination;
}

// Implemented by: infrastructure/persistence/sequelize/repositories/sequelize-blocklist.repository.ts
// Called by: application/use-cases/blocklists/*, application/use-cases/allowlists/*
export interface BlocklistRepository {
  list(): Promise<Blocklist[]>;
  findById(id: number): Promise<Blocklist | null>;
  findByUrl(url: string): Promise<Blocklist | null>;
  /** Aggregate read: blocklist plus its IP rows. */
  findWithIps(id: number): Promise<BlocklistWithIps | null>;
  getIps(blocklistId: number): Promise<BlocklistIp[]>;
  create(url: string, name: string): Promise<Blocklist>;
  deleteById(id: number): Promise<boolean>;
  setEnabled(id: number, enabled: boolean): Promise<Blocklist | null>;
  /** Persists refresh pipeline outcome metadata (updateRefreshOutcome). */
  updateRefreshMetadata(
    id: number,
    meta: {
      lastRefreshAttempt: Date;
      lastSuccessfulRefresh: Date | null;
      lastRefreshFailed: boolean;
    },
  ): Promise<void>;
  /** Refresh pipeline (fetch→parse→delete→import) persistence steps. */
  deleteIpsByOrigin(blocklistId: number, origin: string): Promise<number>;
  insertIps(blocklistId: number, blocklistName: string, values: string[]): Promise<number>;
  /** CrowdSec blocklists (cs_*) sync support. */
  upsertCsBlocklists(entries: CsBlocklist[]): Promise<void>;
  listCsBlocklists(): Promise<CsBlocklist[]>;
  syncCsBlocklistIps(csBlocklistId: string, blocklistName: string, values: string[]): Promise<void>;

  /** Merged listing (api-managed first, then cs-managed) with count attributes. */
  listMerged(opts: {
    unpaged: boolean;
    limit: number;
    offset: number;
    includeIps: boolean;
    onlyApi: boolean;
    onlyCs: boolean;
  }): Promise<{ apiRows: BlocklistRow[]; csRows: BlocklistRow[]; total: number }>;

  /** Detail by id (numeric → api-managed, 'crowdsec-' prefix → cs-managed). */
  findByIdMerged(
    id: string,
    opts: { includeIps: boolean },
  ): Promise<{ type: 'api' | 'cs'; data: Record<string, unknown>; ips: BlocklistIp[] | null } | null>;

  /** Paginated IP rows of one blocklist (api or cs). */
  getIpsPage(
    id: string,
    opts: { limit: number; offset: number; unpaged: boolean; onlyStrings: boolean },
  ): Promise<{ items: BlocklistIp[]; total: number } | null>;
}
