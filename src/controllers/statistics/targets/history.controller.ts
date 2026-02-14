import { Request, Response } from 'express';
import { Alert } from '../../../models';

/**
 * Get target history (alerts grouped by date for a specific target)
 */
export async function getTargetHistory(req: Request, res: Response): Promise<void> {
  try {
    const { item } = req.params;

    // Get all alerts with their dates and events
    const alerts = await Alert.findAll({
      attributes: ['crowdsec_created_at', 'events'],
      raw: true,
    });

    // Filter by target and group by date in JavaScript
    const dateMap = new Map<string, number>();

    alerts.forEach((alert: any) => {
      if (alert.events) {
        const events = typeof alert.events === 'string' ? JSON.parse(alert.events) : alert.events;
        
        // Check if this alert contains the target_fqdn we're looking for
        let hasTarget = false;
        
        if (Array.isArray(events)) {
          for (const event of events) {
            if (event.meta && Array.isArray(event.meta)) {
              for (const metaItem of event.meta) {
                if (metaItem.key === 'target_fqdn' && metaItem.value === item) {
                  hasTarget = true;
                  break;
                }
              }
            }
            if (hasTarget) break;
          }
        }
        
        // If this alert contains the target, count it for this date
        if (hasTarget) {
          const date = new Date(alert.crowdsec_created_at).toISOString().split('T')[0];
          dateMap.set(date, (dateMap.get(date) || 0) + 1);
        }
      }
    });

    // Convert to array and sort by date
    const history = Array.from(dateMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(history);
  } catch (error) {
    const response: any = {
      message: 'Error fetching target history',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    res.status(500).json(response);
  }
}
