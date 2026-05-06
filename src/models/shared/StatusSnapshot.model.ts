import { Process } from "@/types/process.types";

export interface StatusSnapshot {
  csLapi: {
    lapiConnected: boolean;
    lastSuccessfulSync: string | null;
    timestamp: string;
  };
  csBouncer: {
    available: boolean;
  };
  csMonitorApi: {
    version: string;
    newVersionAvailable: string | null;
  };
  processes: Process[];
}
