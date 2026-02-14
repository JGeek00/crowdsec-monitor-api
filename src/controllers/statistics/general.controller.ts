import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Alert, Decision } from '../../models';
import { defaults } from '../../config/defaults';

/**
 * Get comprehensive statistics
 */
export async function getStatistics(req: Request, res: Response): Promise<void> {
  try {
    const { since, amount } = req.query;

    // Parse amount with default value
    const limit = amount ? parseInt(amount as string, 10) : defaults.statistics.topItemsLimit;

    // Parse since date if provided
    let sinceDate: Date | undefined;
    if (since && typeof since === 'string') {
      sinceDate = new Date(since);
      sinceDate.setHours(0, 0, 0, 0);
    }

    // Build where clause for filtering by date
    const whereClauseAlerts = sinceDate
      ? { crowdsec_created_at: { [Op.gte]: sinceDate } }
      : {};
    
    const whereClauseDecisions = sinceDate
      ? { crowdsec_created_at: { [Op.gte]: sinceDate } }
      : {};

    // 1. Alerts in last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const alertsLast24Hours = await Alert.count({
      where: {
        crowdsec_created_at: { [Op.gte]: twentyFourHoursAgo },
      },
    });

    // 2. Active decisions (not expired)
    const now = new Date();
    const activeDecisions = await Decision.count({
      where: {
        expiration: { [Op.gt]: now },
        ...(sinceDate ? { crowdsec_created_at: { [Op.gte]: sinceDate } } : {}),
      },
    });

    // 3. Activity history - Get all alerts and decisions grouped by date
    const alertsByDate = await Alert.findAll({
      attributes: [
        [Alert.sequelize!.fn('strftime', '%Y-%m-%d', Alert.sequelize!.col('crowdsec_created_at')), 'date'],
        [Alert.sequelize!.fn('COUNT', Alert.sequelize!.col('id')), 'count'],
      ],
      where: whereClauseAlerts,
      group: [Alert.sequelize!.fn('strftime', '%Y-%m-%d', Alert.sequelize!.col('crowdsec_created_at'))],
      order: [[Alert.sequelize!.fn('strftime', '%Y-%m-%d', Alert.sequelize!.col('crowdsec_created_at')), 'ASC']],
      raw: true,
    }) as any[];

    const decisionsByDate = await Decision.findAll({
      attributes: [
        [Decision.sequelize!.fn('strftime', '%Y-%m-%d', Decision.sequelize!.col('crowdsec_created_at')), 'date'],
        [Decision.sequelize!.fn('COUNT', Decision.sequelize!.col('id')), 'count'],
      ],
      where: whereClauseDecisions,
      group: [Decision.sequelize!.fn('strftime', '%Y-%m-%d', Decision.sequelize!.col('crowdsec_created_at'))],
      order: [[Decision.sequelize!.fn('strftime', '%Y-%m-%d', Decision.sequelize!.col('crowdsec_created_at')), 'ASC']],
      raw: true,
    }) as any[];

    // Combine alerts and decisions by date
    const activityMap = new Map<string, { amountAlerts: number; amountDecisions: number }>();

    alertsByDate.forEach((item: any) => {
      const date = item.date;
      const existing = activityMap.get(date) || { amountAlerts: 0, amountDecisions: 0 };
      existing.amountAlerts = parseInt(item.count, 10);
      activityMap.set(date, existing);
    });

    decisionsByDate.forEach((item: any) => {
      const date = item.date;
      const existing = activityMap.get(date) || { amountAlerts: 0, amountDecisions: 0 };
      existing.amountDecisions = parseInt(item.count, 10);
      activityMap.set(date, existing);
    });

    const activityHistory = Array.from(activityMap.entries())
      .map(([date, counts]) => ({
        date,
        amountAlerts: counts.amountAlerts,
        amountDecisions: counts.amountDecisions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Top countries - Get all alerts with source and events information
    const alertsWithSource = await Alert.findAll({
      attributes: ['source', 'events'],
      where: whereClauseAlerts,
      raw: true,
    });

    const countryMap = new Map<string, number>();
    const ipOwnerMap = new Map<string, number>();
    const targetMap = new Map<string, number>();

    alertsWithSource.forEach((alert: any) => {
      if (alert.source) {
        // Parse JSON if needed
        const source = typeof alert.source === 'string' ? JSON.parse(alert.source) : alert.source;

        // Count by country
        if (source.cn) {
          countryMap.set(source.cn, (countryMap.get(source.cn) || 0) + 1);
        }

        // Count by IP owner (AS name)
        if (source.as_name) {
          ipOwnerMap.set(source.as_name, (ipOwnerMap.get(source.as_name) || 0) + 1);
        }
      }

      // Count by target (search for target_fqdn in events[].meta[])
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

    const topCountries = Array.from(countryMap.entries())
      .map(([countryCode, amount]) => ({ countryCode, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);

    const topIpOwners = Array.from(ipOwnerMap.entries())
      .map(([ipOwner, amount]) => ({ ipOwner, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);

    const topTargets = Array.from(targetMap.entries())
      .map(([target, amount]) => ({ target, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);

    // 5. Top scenarios
    const scenariosData = await Alert.findAll({
      attributes: [
        'scenario',
        [Alert.sequelize!.fn('COUNT', Alert.sequelize!.col('id')), 'count'],
      ],
      where: whereClauseAlerts,
      group: ['scenario'],
      order: [[Alert.sequelize!.fn('COUNT', Alert.sequelize!.col('id')), 'DESC']],
      limit: limit,
      raw: true,
    });

    const topScenarios = scenariosData.map((item: any) => ({
      scenario: item.scenario,
      amount: parseInt(item.count, 10),
    }));

    // Build response
    res.json({
      alertsLast24Hours,
      activeDecisions,
      activityHistory,
      topCountries,
      topScenarios,
      topIpOwners,
      topTargets,
    });
  } catch (error) {
    const response: any = {
      message: 'Error fetching statistics',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    res.status(500).json(response);
  }
}
