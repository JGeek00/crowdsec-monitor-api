import { Request, Response } from 'express';
import { Alert } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';

/**
 * Get alerts statistics
 */
export async function getAlertStats(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const total = await Alert.count() as number;
    const simulated = await Alert.count({ where: { simulated: true } }) as number;
    const real = total - simulated;

    const topScenarios = await Alert.findAll({
      attributes: [
        'scenario',
        [Alert.sequelize!.fn('COUNT', Alert.sequelize!.col('id')), 'count'],
      ],
      group: ['scenario'],
      order: [[Alert.sequelize!.fn('COUNT', Alert.sequelize!.col('id')), 'DESC']],
      limit: 10,
    });

    // Get all alerts with source information for grouping
    const allAlerts = await Alert.findAll({
      attributes: ['source'],
    });

    // Group by country
    const countryMap = new Map<string, number>();
    const organizationMap = new Map<string, number>();

    allAlerts.forEach(alert => {
      if (alert.source) {
        // Count by country
        const country = alert.source.cn;
        if (country) {
          countryMap.set(country, (countryMap.get(country) || 0) + 1);
        }

        // Count by organization
        const organization = alert.source.as_name;
        if (organization) {
          organizationMap.set(organization, (organizationMap.get(organization) || 0) + 1);
        }
      }
    });

    // Convert maps to sorted arrays
    const topCountries = Array.from(countryMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topOrganizations = Array.from(organizationMap.entries())
      .map(([organization, count]) => ({ organization, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      total,
      simulated,
      real,
      topScenarios,
      topCountries,
      topOrganizations,
    });
  } catch (error) {
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching alert statistics', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
