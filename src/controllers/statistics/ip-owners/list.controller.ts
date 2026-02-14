import { Request, Response } from 'express';
import { Alert } from '../../../models';

/**
 * Get top IP owners statistics
 */
export async function getTopIpOwners(req: Request, res: Response): Promise<void> {
  try {
    const alertsWithSource = await Alert.findAll({
      attributes: ['source'],
      raw: true,
    });

    const ipOwnerMap = new Map<string, number>();

    alertsWithSource.forEach((alert: any) => {
      if (alert.source) {
        const source = typeof alert.source === 'string' ? JSON.parse(alert.source) : alert.source;
        if (source.as_name) {
          ipOwnerMap.set(source.as_name, (ipOwnerMap.get(source.as_name) || 0) + 1);
        }
      }
    });

    const ipOwners = Array.from(ipOwnerMap.entries())
      .map(([ipOwner, amount]) => ({ ipOwner, amount }))
      .sort((a, b) => b.amount - a.amount);

    res.json(ipOwners);
  } catch (error) {
    const response: any = {
      message: 'Error fetching IP owners statistics',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    res.status(500).json(response);
  }
}
