import { Request, Response } from 'express';
import { Alert } from '@/models';
import { Op, WhereOptions } from 'sequelize';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { escapeLike } from '@/utils/sql';
import { AlertAttributes, EventData, SourceInfo } from '@/models/Alert';
import { AlertRaw, AlertListResponse } from '@/interfaces/alert.interface';
import { DB_SORTING } from '@/interfaces/database.interface';
import { parseAlertMeta } from '@/utils/parse-meta-values';

/**
 * Get all alerts with filtering and pagination
 */
export async function getAllAlerts(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { limit = 100, offset = 0, unpaged = false, scenario, simulated, ip_address, country, ip_owner, target } = req.query;

    const where: WhereOptions<AlertAttributes> = {};
    
    // Filter by scenario (single or multiple)
    if (scenario) {
      const scenarios = Array.isArray(scenario) ? scenario : [scenario];
      where.scenario = {
        [Op.or]: scenarios.map(s => ({ [Op.like]: `%${escapeLike(String(s))}%` }))
      };
    }
    
    if (simulated !== undefined) {
      where.simulated = String(simulated) === 'true';
    }

    // Fetch all alerts for filtering options (from entire database)
    const allAlerts = await Alert.findAll({
      attributes: [Alert.col.scenario, Alert.col.source, Alert.col.events],
      raw: true,
    });

    // Extract unique filtering options
    const countriesSet = new Set<string>();
    const scenariosSet = new Set<string>();
    const ipOwnersSet = new Set<string>();
    const targetsSet = new Set<string>();

    (allAlerts as unknown as AlertRaw[]).forEach((alert) => {
      // Extract scenarios
      if (alert.scenario) {
        scenariosSet.add(alert.scenario);
      }

      // Extract countries, ipOwners from source
      if (alert.source) {
        const source = typeof alert.source === 'string' ? JSON.parse(alert.source) as SourceInfo : alert.source;
        
        if (source.cn) {
          countriesSet.add(source.cn);
        }
        
        if (source.as_name) {
          ipOwnersSet.add(source.as_name);
        }
      }

      // Extract targets from events
      if (alert.events) {
        const events = typeof alert.events === 'string' ? JSON.parse(alert.events) as EventData[] : alert.events;
        
        if (Array.isArray(events)) {
          events.forEach((event) => {
            if (event.meta && Array.isArray(event.meta)) {
              event.meta.forEach((metaItem) => {
                if (metaItem.key === 'target_fqdn' && metaItem.value) {
                  targetsSet.add(metaItem.value);
                }
              });
            }
          });
        }
      }
    });

    // Fetch all alerts matching basic filters
    let alerts = await Alert.findAll({
      where,
      attributes: {
        exclude: [Alert.col.createdAt, Alert.col.updatedAt]
      },
      order: [[Alert.col.crowdsecCreatedAt, DB_SORTING.DESC]],
    });

    // Filter by IP address in JavaScript (since source is JSON)
    if (ip_address) {
      const ipAddresses = Array.isArray(ip_address) ? ip_address : [ip_address];
      alerts = alerts.filter(alert => 
        alert.source && ipAddresses.includes(alert.source.ip)
      );
    }

    // Filter by country in JavaScript (since source is JSON)
    if (country) {
      const countries = Array.isArray(country) ? country : [country];
      const upperCountries = countries.map(c => String(c).toUpperCase());
      alerts = alerts.filter(alert => 
        alert.source && alert.source.cn && upperCountries.includes(alert.source.cn.toUpperCase())
      );
    }

    // Filter by IP owner/organization in JavaScript (since source is JSON)
    if (ip_owner) {
      const owners = Array.isArray(ip_owner) ? ip_owner : [ip_owner];
      alerts = alerts.filter(alert => 
        alert.source && alert.source.as_name && 
        owners.some(owner => alert.source.as_name?.toLowerCase().includes(String(owner).toLowerCase()))
      );
    }

    // Filter by target in JavaScript (since events is JSON)
    if (target) {
      const targets = Array.isArray(target) ? target : [target];
      alerts = alerts.filter(alert => {
        if (alert.events && Array.isArray(alert.events)) {
          return alert.events.some((event) => {
            if (event.meta && Array.isArray(event.meta)) {
              return event.meta.some((metaItem) => 
                metaItem.key === 'target_fqdn' && 
                metaItem.value && 
                targets.includes(metaItem.value)
              );
            }
            return false;
          });
        }
        return false;
      });
    }

    const total = alerts.length;

    // Validate offset is not greater than total (only when paginated)
    if (!unpaged && (offset as number) > total) {
      res.status(400).json(errorResponse('Validation error', `Invalid parameter: offset (${offset}) cannot be greater than total items (${total})`));
      return;
    }

    // Apply pagination after filtering
    let paginatedAlerts = alerts;
    if (!unpaged) {
      paginatedAlerts = alerts.slice(offset as number, (offset as number) + (limit as number));
    }

    const response: AlertListResponse = {
      filtering: {
        countries: Array.from(countriesSet).sort(),
        scenarios: Array.from(scenariosSet).sort(),
        ipOwners: Array.from(ipOwnersSet).sort(),
        targets: Array.from(targetsSet).sort(),
      },
      items: paginatedAlerts.map(alert =>
        parseAlertMeta(alert.toJSON() as AlertAttributes)
      ),
    };

    // Include pagination info only when paginated
    if (!unpaged) {
      const page = Math.floor((offset as number) / (limit as number)) + 1;
      response.pagination = {
        page,
        amount: paginatedAlerts.length,
        total,
      };
    } else {
      response.total = total;
    }

    res.json(response);
  } catch (error) {
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching alerts', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
