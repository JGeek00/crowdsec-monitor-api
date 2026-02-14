import { Request, Response } from 'express';
import { crowdSecAPI, databaseService } from '../../services';
import { CrowdSecCreateAlertPayload } from '../../types/crowdsec.types';
import { config } from '../../config';
import { API_SCENARIO_NAME } from '../../constants/scenarios';

interface CreateDecisionRequest {
  ip: string;
  duration: string;
  reason: string;
  type: 'ban' | 'captcha' | 'throttle' | 'allow';
}

/**
 * Create a decision in CrowdSec LAPI
 * Simplified endpoint that creates an alert with a decision
 */
export async function createDecision(req: Request, res: Response): Promise<void> {
  try {
    const { ip, duration, reason, type }: CreateDecisionRequest = req.body;

    // Get current timestamp in ISO format
    const now = new Date().toISOString();

    // Build the alert payload for LAPI
    const alertPayload: CrowdSecCreateAlertPayload = [
      {
        scenario: API_SCENARIO_NAME,
        campaign_name: API_SCENARIO_NAME,
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
            scenario: API_SCENARIO_NAME,
            scope: 'ip',
          },
        ],
      },
    ];

    // Create alert with decision in CrowdSec LAPI
    const createdIds = await crowdSecAPI.createAlerts(alertPayload);

    // Sync alerts from LAPI after successful creation
    await databaseService.syncAlerts();

    res.status(201).json({
      message: 'Decision created successfully',
      alert_ids: createdIds,
      decision: {
        ip,
        type,
        duration,
        reason,
      },
    });
  } catch (error) {
    const response: any = {
      message: 'Error creating decision',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    res.status(500).json(response);
  }
}
