export const PROCESS_BLOCKLIST_FIELD_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
} as const;
export type ProcessBlocklistFieldStatus = typeof PROCESS_BLOCKLIST_FIELD_STATUS[keyof typeof PROCESS_BLOCKLIST_FIELD_STATUS];

export const PROCESS_BLOCKLIST_STEP = {
  FETCH: 'fetch',
  PARSE: 'parse',
  IMPORT: 'import',
} as const;
export type ProcessBlocklistStep = typeof PROCESS_BLOCKLIST_STEP[keyof typeof PROCESS_BLOCKLIST_STEP];

export const PROCESS_FIELD_BLOCKLIST = {
  IMPORT: 'blocklistImport',
  ENABLE: 'blocklistEnable',
} as const;
export type ProcessFieldBlocklist = typeof PROCESS_FIELD_BLOCKLIST[keyof typeof PROCESS_FIELD_BLOCKLIST];

export const PROCESS_FIELD_BLOCKLIST_OPS = {
  DISABLE: 'blocklistDisable',
  DELETE: 'blocklistDelete',
} as const;
export type ProcessFieldBlocklistOps = typeof PROCESS_FIELD_BLOCKLIST_OPS[keyof typeof PROCESS_FIELD_BLOCKLIST_OPS];

export interface ProcessBlocklistProgress {
  totalIps: number;
  processedIps: number;
}

export interface ProcessBlocklistIps {
  blocklistIps: number;
  ipsToDelete: number;
  processedIps: number;
}

export interface ProcessBlocklistRefresh {
  totalBlocklists: number;
  processedBlocklists: number;
  successful: number;
  failed: number;
}

export interface ProcessBlocklist {
  step: ProcessBlocklistStep;
  fetched: ProcessBlocklistFieldStatus;
  parsed: ProcessBlocklistFieldStatus;
  imported: ProcessBlocklistFieldStatus;
  processIps: ProcessBlocklistProgress;
}

export interface Process {
  id: string;
  beginDatetime: string;
  endDatetime: string | null;
  successful: boolean | null;
  blocklistImport?: ProcessBlocklist;
  blocklistEnable?: ProcessBlocklist;
  blocklistDisable?: ProcessBlocklistIps;
  blocklistDelete?: ProcessBlocklistIps;
  blocklistRefresh?: ProcessBlocklistRefresh;
}
