import { crowdSecAPI, type CrowdSecAPIService } from './lapi/crowdsec-api';
import type { CrowdSecAlert, CrowdSecCreateAlertPayload } from '@/types/crowdsec.types';
import type { LapiAlertsParams, LapiClient } from '@/application/ports/lapi-client.port';

/**
 * HTTP implementation of the LapiClient port.
 * Fuses the legacy crowdsec-api services (base-client + alerts + decisions +
 * allowlists) behind a single application-facing interface.
 */
export class HttpLapiClient implements LapiClient {
  private readonly api: CrowdSecAPIService;

  constructor(api: CrowdSecAPIService = crowdSecAPI) {
    this.api = api;
  }

  testConnection(): Promise<boolean> {
    return this.api.testConnection();
  }

  checkStatus(): Promise<boolean> {
    return this.api.checkStatus();
  }

  getLastLapiConnected(): boolean {
    return this.api.getLastLapiConnected();
  }

  async getAlerts(params?: LapiAlertsParams): Promise<CrowdSecAlert[]> {
    return this.api.alerts.getAlerts(params ?? {});
  }

  deleteAlert(id: number): Promise<number> {
    return this.api.alerts.deleteAlert(id);
  }

  createAlerts(payload: unknown): Promise<string[]> {
    return this.api.alerts.createAlerts(payload as CrowdSecCreateAlertPayload);
  }

  deleteDecision(id: number): Promise<number> {
    return this.api.decisions.deleteDecision(id);
  }

  /** Allowlist entries (values) from the LAPI; empty on failure, never throws. */
  fetchAllowlistEntries(): Promise<string[]> {
    return this.api.allowlists
      .getAllowlists()
      .then((allowlists) => allowlists.flatMap((al) => al.items.map((item) => item.value)))
      .catch(() => []);
  }
}

export const httpLapiClient = new HttpLapiClient();
