import { Request, Response } from 'express';
import { Alert } from '../../../models';

/**
 * Get top targets statistics
 */
export async function getTopTargets(req: Request, res: Response): Promise<void> {
  try {
    const alerts = await Alert.findAll({
      attributes: ['events'],
      raw: true,
    });

    const targetMap = new Map<string, number>();

    alerts.forEach((alert: any) => {
      if (alert.events) {
        const events = typeof alert.events === 'string' ? JSON.parse(alert.events) : alert.events;
        
        // Collect unique target_fqdn values from this alert's events
        const targetsInAlert = new Set<string>();
        
        if (Array.isArray(events)) {
          events.forEach((event: any) => {
            if (event.meta && Array.isArray(event.meta)) {
              event.meta.forEach((metaItem: any) => {
                if (metaItem.key === 'target_fqdn' && metaItem.value) {
                  targetsInAlert.add(metaItem.value);
                }
              });
            }
          });
        }
        
        // Count each unique target only once per alert
        targetsInAlert.forEach(target => {
          targetMap.set(target, (targetMap.get(target) || 0) + 1);
        });
      }
    });

    const targets = Array.from(targetMap.entries())
      .map(([target, amount]) => ({ target, amount }))
      .sort((a, b) => b.amount - a.amount);

    res.json(targets);
  } catch (error) {
    const response: any = {
      message: 'Error fetching targets statistics',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    res.status(500).json(response);
  }
}
