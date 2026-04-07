import { config } from '@/config';
import { CrowdSecDecision } from '@/types/crowdsec.types';
import { CrowdSecBaseClient } from './base-client.service';
import { AlertsService } from './alerts.service';

export class DecisionsService {
  constructor(
    private readonly base: CrowdSecBaseClient,
    private readonly alerts: AlertsService,
  ) {}

  /**
   * Get decisions from alerts
   * Note: CrowdSec LAPI doesn't have a dedicated decisions endpoint.
   * Decisions are included in the alerts data.
   */
  async getDecisionsFromAlerts(params?: {
    since?: string;
    until?: string;
  }): Promise<CrowdSecDecision[]> {
    try {
      const alertList = await this.alerts.getAlerts({ ...params, has_active_decision: true });

      const decisions: CrowdSecDecision[] = [];
      for (const alert of alertList) {
        if (alert.decisions && Array.isArray(alert.decisions)) {
          decisions.push(...alert.decisions);
        }
      }

      return decisions;
    } catch (error) {
      this.base.handleError(error, 'fetching decisions from alerts');
      return [];
    }
  }

  /**
   * Delete a decision by ID from CrowdSec LAPI
   * @param id - Decision ID to delete
   * @returns Number of deleted decisions
   */
  async deleteDecision(id: number): Promise<number> {
    try {
      const headers = await this.base.getAuthHeaders();
      const response = await this.base.client.delete(`/v1/decisions/${id}`, { headers });

      if (response.data && response.data.nbDeleted) {
        return parseInt(response.data.nbDeleted, 10);
      }

      return 0;
    } catch (error) {
      this.base.handleError(error, `deleting decision ${id}`);
      throw error;
    }
  }

  /**
   * Get all active decisions from CrowdSec LAPI using the bouncer API key.
   * Uses the X-Api-Key header (CROWDSEC_BOUNCER_KEY), not the watcher Bearer token.
   * @returns Set of currently blocked IP/CIDR values
   */
  async getActiveDecisions(): Promise<Set<string>> {
    const response = await this.base.client.get('/v1/decisions', {
      headers: { 'X-Api-Key': config.crowdsec.bouncerKey },
    });

    const decisions: Array<{ value: string }> = response.data || [];
    return new Set(decisions.map((d) => d.value));
  }
}
