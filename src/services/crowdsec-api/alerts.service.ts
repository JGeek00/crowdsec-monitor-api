import { CrowdSecAlert, CrowdSecCreateAlertPayload } from '@/types/crowdsec.types';
import { CrowdSecBaseClient } from './base-client.service';

export class AlertsService {
  constructor(private readonly base: CrowdSecBaseClient) {}

  /**
   * Get all alerts from CrowdSec LAPI
   * @param params - Query parameters
   * @param params.since - Duration string (e.g., '1h', '30s')
   * @param params.until - Duration string (e.g., '1h', '30s')
   * @param params.has_active_decision - Filter alerts with active decisions
   */
  async getAlerts(params?: {
    since?: string;
    until?: string;
    has_active_decision?: boolean;
    origin?: string;
    scenario?: string;
  }): Promise<CrowdSecAlert[]> {
    try {
      const headers = await this.base.getAuthHeaders();

      const queryParams = new URLSearchParams();
      if (params?.since) queryParams.append('since', params.since);
      if (params?.until) queryParams.append('until', params.until);
      if (params?.has_active_decision !== undefined) {
        queryParams.append('has_active_decision', String(params.has_active_decision));
      }
      if (params?.origin) queryParams.append('origin', params.origin);
      if (params?.scenario) queryParams.append('scenario', params.scenario);

      const response = await this.base.client.get('/v1/alerts', { params: queryParams, headers });
      return response.data || [];
    } catch (error) {
      this.base.handleError(error, 'fetching alerts');
      return [];
    }
  }

  /**
   * Get a specific alert by ID
   */
  async getAlertById(id: number): Promise<CrowdSecAlert | null> {
    try {
      const headers = await this.base.getAuthHeaders();
      const response = await this.base.client.get(`/v1/alerts/${id}`, { headers });
      return response.data;
    } catch (error) {
      this.base.handleError(error, `fetching alert ${id}`);
      return null;
    }
  }

  /**
   * Create one or more alerts in CrowdSec LAPI
   * @param alerts - Array of alerts to create
   * @returns Array of created alert IDs or empty array on error
   */
  async createAlerts(alerts: CrowdSecCreateAlertPayload): Promise<string[]> {
    try {
      const headers = await this.base.getAuthHeaders();
      const response = await this.base.client.post('/v1/alerts', alerts, { headers });

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      this.base.handleError(error, 'creating alerts');
      throw error;
    }
  }

  /**
   * Delete an alert by ID from CrowdSec LAPI
   * @param id - Alert ID to delete
   * @returns Number of deleted alerts
   */
  async deleteAlert(id: number): Promise<number> {
    try {
      const headers = await this.base.getAuthHeaders();
      const response = await this.base.client.delete(`/v1/alerts/${id}`, { headers });

      if (response.data && response.data.nbDeleted) {
        return parseInt(response.data.nbDeleted, 10);
      }

      return 0;
    } catch (error) {
      this.base.handleError(error, `deleting alert ${id}`);
      throw error;
    }
  }
}
