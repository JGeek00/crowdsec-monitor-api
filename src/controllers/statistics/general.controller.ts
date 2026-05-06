import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { AlertsTable, DecisionsTable, Alert_EventData, Alert_SourceInfo, UnparsedMetaData, ResponseWithError, GetStatisticsResponse, GetStatisticsResponse_ActivityHistory, GetStatisticsQueryParams, DateCountRow, ScenarioCountRow } from '@/models';
import { defaults } from '@/config/env-defaults';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { DB_SORTING } from '@/types/database.types';

/**
 * Get comprehensive statistics
 */
type Res = ResponseWithError<GetStatisticsResponse>;
export async function getStatistics(req: Request<{}, Res, {}, GetStatisticsQueryParams>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { since, amount } = req.query;

    // Parse amount with default value
    const limit = amount ?? defaults.statistics.topItemsLimit;

    // Parse since date if provided
    let sinceDate: Date | undefined;
    if (since && typeof since === 'string') {
      sinceDate = new Date(since);
      sinceDate.setHours(0, 0, 0, 0);
    }

    // Build where clause for filtering by date
    const whereClauseAlerts = sinceDate
      ? { [AlertsTable.col.crowdsecCreatedAt]: { [Op.gte]: sinceDate } }
      : {};
    
    const whereClauseDecisions = sinceDate
      ? { [DecisionsTable.col.crowdsecCreatedAt]: { [Op.gte]: sinceDate } }
      : {};

    // 1. Alerts in last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const alertsLast24Hours = await AlertsTable.count({
      where: {
        [AlertsTable.col.crowdsecCreatedAt]: { [Op.gte]: twentyFourHoursAgo },
      },
    });

    // 2. Active decisions (not expired)
    const now = new Date();
    const activeDecisions = await DecisionsTable.count({
      where: {
        expiration: { [Op.gt]: now },
        ...(sinceDate ? { [DecisionsTable.col.crowdsecCreatedAt]: { [Op.gte]: sinceDate } } : {}),
      },
    });

    // 3. Activity history - Get all alerts and decisions grouped by date
    const alertsByDate = await AlertsTable.findAll({
      attributes: [
        [AlertsTable.sequelize!.fn('DATE', AlertsTable.sequelize!.col(AlertsTable.col.crowdsecCreatedAt)), 'date'],
        [AlertsTable.sequelize!.fn('COUNT', AlertsTable.sequelize!.col(AlertsTable.col.id)), 'count'],
      ],
      where: whereClauseAlerts,
      group: [AlertsTable.sequelize!.fn('DATE', AlertsTable.sequelize!.col(AlertsTable.col.crowdsecCreatedAt))],
      order: [[AlertsTable.sequelize!.fn('DATE', AlertsTable.sequelize!.col(AlertsTable.col.crowdsecCreatedAt)), DB_SORTING.ASC]],
      raw: true,
    }) as unknown as DateCountRow[];

    const decisionsByDate = await DecisionsTable.findAll({
      attributes: [
        [DecisionsTable.sequelize!.fn('DATE', DecisionsTable.sequelize!.col(DecisionsTable.col.crowdsecCreatedAt)), 'date'],
        [DecisionsTable.sequelize!.fn('COUNT', DecisionsTable.sequelize!.col(DecisionsTable.col.id)), 'count'],
      ],
      where: whereClauseDecisions,
      group: [DecisionsTable.sequelize!.fn('DATE', DecisionsTable.sequelize!.col(DecisionsTable.col.crowdsecCreatedAt))],
      order: [[DecisionsTable.sequelize!.fn('DATE', DecisionsTable.sequelize!.col(DecisionsTable.col.crowdsecCreatedAt)), DB_SORTING.ASC]],
      raw: true,
    }) as unknown as DateCountRow[];

    // Combine alerts and decisions by date
    const activityMap = new Map<string, { amountAlerts: number; amountDecisions: number }>();

    alertsByDate.forEach((item) => {
      const date = item.date;
      const existing = activityMap.get(date) || { amountAlerts: 0, amountDecisions: 0 };
      existing.amountAlerts = parseInt(item.count, 10);
      activityMap.set(date, existing);
    });

    decisionsByDate.forEach((item) => {
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
    const alertsWithSource = await AlertsTable.findAll({
      attributes: ['source', 'events'],
      where: whereClauseAlerts,
      raw: true,
    });

    const countryMap = new Map<string, number>();
    const ipOwnerMap = new Map<string, number>();
    const targetMap = new Map<string, number>();

    (alertsWithSource).forEach((alert) => {
      if (alert.source) {
        // Parse JSON if needed
        const source = typeof alert.source === 'string' ? JSON.parse(alert.source) as Alert_SourceInfo : alert.source;

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
        const events = typeof alert.events === 'string' ? JSON.parse(alert.events) as Alert_EventData<UnparsedMetaData>[] : alert.events;
        
        // Collect unique target_fqdn values from this alert's events
        const targetsInAlert = new Set<string>();
        
        if (Array.isArray(events)) {
          events.forEach((event) => {
            if (event.meta && Array.isArray(event.meta)) {
              event.meta.forEach((metaItem) => {
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
    const scenariosData = await AlertsTable.findAll({
      attributes: [
        'scenario',
        [AlertsTable.sequelize!.fn('COUNT', AlertsTable.sequelize!.col('id')), 'count'],
      ],
      where: whereClauseAlerts,
      group: ['scenario'],
      order: [[AlertsTable.sequelize!.fn('COUNT', AlertsTable.sequelize!.col('id')), DB_SORTING.DESC]],
      limit: limit,
      raw: true,
    });

    const topScenarios = (scenariosData as unknown as ScenarioCountRow[]).map((item) => ({
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
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching statistics', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
