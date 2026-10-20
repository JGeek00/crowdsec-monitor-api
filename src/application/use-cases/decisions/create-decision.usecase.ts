import { config } from '@/config';
import { MANUAL_DECISION } from '@/constants/scenarios';
import type { SyncAlertsUseCase } from '../alerts/sync-alerts.usecase';
import type { LapiClient } from '@/application/ports/lapi-client.port';

export interface CreateDecisionInput {
  ip: string;
  duration: string;
  reason: string;
  type: string;
}

export interface CreateDecisionResult {
  message: string;
  alert_ids: string[];
  decision: CreateDecisionInput;
}

// Called by: delivery/http controllers (decisions create endpoint)
export class CreateDecisionUseCase {
  constructor(private readonly deps: { lapiClient: LapiClient; syncAlerts: SyncAlertsUseCase }) {}

  async execute(input: CreateDecisionInput): Promise<CreateDecisionResult> {
    const { ip, duration, reason, type } = input;

    // Get current timestamp in ISO format
    const now = new Date().toISOString();

    const createdIds = await this.deps.lapiClient.createAlerts([
      {
        scenario: MANUAL_DECISION,
        campaign_name: MANUAL_DECISION,
        message: reason,
        events_count: 1,
        start_at: now,
        stop_at: now,
        capacity: 0,
        leakspeed: '0',
        simulated: false,
        events: [],
        scenario_hash: '',
        scenario_version: '',
        source: {
          scope: 'ip',
          value: ip,
        },
        decisions: [
          {
            type: type,
            duration: duration,
            value: ip,
            origin: config.crowdsec.user,
            scenario: MANUAL_DECISION,
            scope: 'ip',
          },
        ],
      },
    ]);

    await this.deps.syncAlerts.execute();

    return {
      message: 'Decision created successfully',
      alert_ids: createdIds,
      decision: { ip, type, duration, reason },
    };
  }
}
