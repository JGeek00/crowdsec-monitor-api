import { Request, Response } from 'express';
import { Alert } from '../../../models';

/**
 * Get top countries statistics
 */
export async function getTopCountries(req: Request, res: Response): Promise<void> {
  try {
    const alertsWithSource = await Alert.findAll({
      attributes: ['source'],
      raw: true,
    });

    const countryMap = new Map<string, number>();

    alertsWithSource.forEach((alert: any) => {
      if (alert.source) {
        const source = typeof alert.source === 'string' ? JSON.parse(alert.source) : alert.source;
        if (source.cn) {
          countryMap.set(source.cn, (countryMap.get(source.cn) || 0) + 1);
        }
      }
    });

    const countries = Array.from(countryMap.entries())
      .map(([countryCode, amount]) => ({ countryCode, amount }))
      .sort((a, b) => b.amount - a.amount);

    res.json(countries);
  } catch (error) {
    const response: any = {
      message: 'Error fetching countries statistics',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    res.status(500).json(response);
  }
}
