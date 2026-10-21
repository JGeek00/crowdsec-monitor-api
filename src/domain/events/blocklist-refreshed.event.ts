import { BLOCKLIST_TYPE, type BlocklistType } from '../entities/blocklist.entity';

/** Emitted after a blocklist refresh pipeline (fetch → parse → delete → import) finishes. */
export interface BlocklistRefreshedEvent {
  kind: 'blocklist-refreshed';
  blocklistId: number;
  blocklistName: string;
  type: BlocklistType;
  importedIps: number;
  deletedIps: number;
  ok: boolean;
}

export const isManagedBlocklistType = (type: string): boolean => type === BLOCKLIST_TYPE.API;
