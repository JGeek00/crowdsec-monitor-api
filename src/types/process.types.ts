export const PROCESS_BLOCKLIST_FIELD_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
} as const;
export type ProcessBlocklistFieldStatus =
  (typeof PROCESS_BLOCKLIST_FIELD_STATUS)[keyof typeof PROCESS_BLOCKLIST_FIELD_STATUS];

export const PROCESS_BLOCKLIST_STEP = {
  FETCH: 'fetch',
  PARSE: 'parse',
  DELETE: 'delete',
  IMPORT: 'import',
} as const;
export type ProcessBlocklistStep = (typeof PROCESS_BLOCKLIST_STEP)[keyof typeof PROCESS_BLOCKLIST_STEP];

export const PROCESS_BLOCKLIST_REFRESH_STEP = {
  FETCH: 'fetch',
  PARSE: 'parse',
  DELETE: 'delete',
  IMPORT: 'import',
} as const;
export type ProcessBlocklistRefreshStep =
  (typeof PROCESS_BLOCKLIST_REFRESH_STEP)[keyof typeof PROCESS_BLOCKLIST_REFRESH_STEP];

export const PROCESS_BLOCKLIST_STEP_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
} as const;
export type ProcessBlocklistStepStatus =
  (typeof PROCESS_BLOCKLIST_STEP_STATUS)[keyof typeof PROCESS_BLOCKLIST_STEP_STATUS];

export interface ProcessBlocklistRefreshSteps {
  fetch: ProcessBlocklistStepStatus;
  parse: ProcessBlocklistStepStatus;
  delete: ProcessBlocklistStepStatus;
  import: ProcessBlocklistStepStatus;
}

export interface ProcessBlocklistRefreshEntry {
  number: number;
  name: string;
  steps: ProcessBlocklistRefreshSteps;
}

export const PROCESS_FIELD_BLOCKLIST = {
  IMPORT: 'blocklistImport',
  ENABLE: 'blocklistEnable',
  SINGLE_REFRESH: 'blocklistSingleRefresh',
} as const;
export type ProcessFieldBlocklist = (typeof PROCESS_FIELD_BLOCKLIST)[keyof typeof PROCESS_FIELD_BLOCKLIST];

export const PROCESS_FIELD_BLOCKLIST_OPS = {
  DISABLE: 'blocklistDisable',
  DELETE: 'blocklistDelete',
} as const;
export type ProcessFieldBlocklistOps = (typeof PROCESS_FIELD_BLOCKLIST_OPS)[keyof typeof PROCESS_FIELD_BLOCKLIST_OPS];

export interface ProcessBlocklistProgress {
  totalIps: number;
  processedIps: number;
}

interface BlocklistInfo {
  blocklistId: number;
  blocklistName: string;
}

export interface ProcessBlocklistIps extends BlocklistInfo {
  blocklistIps: number;
  ipsToDelete: number;
  processedIps: number;
}

export interface ProcessBlocklist extends BlocklistInfo {
  step: ProcessBlocklistStep;
  fetched: ProcessBlocklistFieldStatus;
  parsed: ProcessBlocklistFieldStatus;
  deleted: ProcessBlocklistFieldStatus;
  imported: ProcessBlocklistFieldStatus;
  processIps: ProcessBlocklistProgress;
}

export interface ProcessBlocklistRefresh {
  totalBlocklists: number;
  currentBlocklist: number;
  blocklists: ProcessBlocklistRefreshEntry[];
  totalIps: number;
}

export interface Process {
  id: string;
  beginDatetime: string;
  endDatetime: string | null;
  successful: boolean | null;
  error: string | null;
  blocklistImport?: ProcessBlocklist;
  blocklistEnable?: ProcessBlocklist;
  blocklistSingleRefresh?: ProcessBlocklist;
  blocklistDisable?: ProcessBlocklistIps;
  blocklistDelete?: ProcessBlocklistIps;
  blocklistRefresh?: ProcessBlocklistRefresh;
}

export interface SyncOneCallbacks {
  onStep(step: ProcessBlocklistRefreshStep, status: ProcessBlocklistStepStatus): void;
  onParsed(totalIps: number): void;
  onImportProgress(chunkSize: number): void;
}
