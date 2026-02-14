import { Request, Response } from 'express';
import { Alert } from '../../models';
import { Op } from 'sequelize';

/**
 * Get all alerts with filtering and pagination
 */
export async function getAllAlerts(req: Request, res: Response): Promise<void> {
  try {
    const { limit = 100, offset = 0, unpaged = false, scenario, simulated, ip_address, country, ip_owner } = req.query;

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
      items: paginatedAlerts.map(alert => {
        const json = alert.toJSON();
        // Parse meta.value if it's a JSON string
        if (json.meta && Array.isArray(json.meta)) {
          json.meta = json.meta.map((metaItem: any) => {
            if (metaItem.value && typeof metaItem.value === 'string') {
              try {
                const parsed = JSON.parse(metaItem.value);
                // Ensure value is always an array
                metaItem.value = Array.isArray(parsed) ? parsed : [parsed];
              } catch (e) {
                // If parse fails, wrap the string in an array
                metaItem.value = [metaItem.value];
              }
            }
            return metaItem;
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
