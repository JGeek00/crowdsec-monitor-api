import { Request, Response } from 'express';
import { Alert } from '../../models';
import { Op } from 'sequelize';

/**
 * Parse meta array values that might be JSON strings
 * Always returns value as an array of strings
 */
function parseMetaValues(meta: any[]): any[] {
  if (!Array.isArray(meta)) return meta;
  
  return meta.map(item => {
    if (item.value === undefined || item.value === null) {
      return { ...item, value: [] };
    }

    // If already an array, ensure all elements are strings
    if (Array.isArray(item.value)) {
      return { ...item, value: item.value.map((v: any) => String(v)) };
    }

    // If it's a string, try to parse it
    if (typeof item.value === 'string') {
      try {
        const parsed = JSON.parse(item.value);
        // If parsed result is an array, convert all elements to strings
        if (Array.isArray(parsed)) {
          return { ...item, value: parsed.map((v: any) => String(v)) };
        }
        // If it's not an array, stringify it and wrap in array
        return { ...item, value: [String(parsed)] };
      } catch {
        // If parsing fails, wrap the string in an array
        return { ...item, value: [item.value] };
      }
    }

    // For any other type, convert to string and wrap in array
    return { ...item, value: [String(item.value)] };
  });
}

/**
 * Get all alerts with filtering and pagination
 */
export async function getAllAlerts(req: Request, res: Response): Promise<void> {
  try {
    const { limit = 100, offset = 0, unpaged = false, scenario, simulated, ip_address, country, ip_owner, target } = req.query;

    const where: any = {};
    
    // Filter by scenario (single or multiple)
    if (scenario) {
      const scenarios = Array.isArray(scenario) ? scenario : [scenario];
      where.scenario = {
        [Op.or]: scenarios.map(s => ({ [Op.like]: `%${s}%` }))
      };
    }
    
    if (simulated !== undefined) {
      where.simulated = simulated;
    }

    // Fetch all alerts for filtering options (from entire database)
    const allAlerts = await Alert.findAll({
      attributes: ['scenario', 'source', 'events'],
      raw: true,
    });

    // Extract unique filtering options
    const countriesSet = new Set<string>();
    const scenariosSet = new Set<string>();
    const ipOwnersSet = new Set<string>();
    const targetsSet = new Set<string>();

    allAlerts.forEach((alert: any) => {
      // Extract scenarios
      if (alert.scenario) {
        scenariosSet.add(alert.scenario);
      }

      // Extract countries, ipOwners from source
      if (alert.source) {
        const source = typeof alert.source === 'string' ? JSON.parse(alert.source) : alert.source;
        
        if (source.cn) {
          countriesSet.add(source.cn);
        }
        
        if (source.as_name) {
          ipOwnersSet.add(source.as_name);
        }
      }

      // Extract targets from events
      if (alert.events) {
        const events = typeof alert.events === 'string' ? JSON.parse(alert.events) : alert.events;
        
        if (Array.isArray(events)) {
          events.forEach((event: any) => {
            if (event.meta && Array.isArray(event.meta)) {
              event.meta.forEach((metaItem: any) => {
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
        exclude: ['created_at', 'updated_at']
      },
      order: [['crowdsec_created_at', 'DESC']],
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
          return alert.events.some((event: any) => {
            if (event.meta && Array.isArray(event.meta)) {
              return event.meta.some((metaItem: any) => 
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
      res.status(400).json({
        message: `Invalid parameter: offset (${offset}) cannot be greater than total items (${total})`,
      });
      return;
    }

    // Apply pagination after filtering
    let paginatedAlerts = alerts;
    if (!unpaged) {
      paginatedAlerts = alerts.slice(offset as number, (offset as number) + (limit as number));
    }

    const response: any = {
      filtering: {
        countries: Array.from(countriesSet).sort(),
        scenarios: Array.from(scenariosSet).sort(),
        ipOwners: Array.from(ipOwnersSet).sort(),
        targets: Array.from(targetsSet).sort(),
      },
      items: paginatedAlerts.map(alert => {
        const json = alert.toJSON();
        
        // Parse meta values
        if (json.meta && Array.isArray(json.meta)) {
          json.meta = parseMetaValues(json.meta);
        }

        // Parse meta values in events
        if (json.events && Array.isArray(json.events)) {
          json.events = json.events.map((event: any) => {
            if (event.meta && Array.isArray(event.meta)) {
              event.meta = parseMetaValues(event.meta);
            }
            return event;
          });
        }

        return json;
      }),
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
    const response: any = {
      message: 'Error fetching alerts',
    };
    
    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    res.status(500).json(response);
  }
}
