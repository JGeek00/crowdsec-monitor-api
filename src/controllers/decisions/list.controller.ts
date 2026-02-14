import { Request, Response } from 'express';
import { Decision, Alert } from '../../models';
import { Op } from 'sequelize';

/**
 * Get all decisions with filtering and pagination
 * @param only_active - Optional boolean to filter only active decisions (expiration > now)
 */
export async function getAllDecisions(req: Request, res: Response): Promise<void> {
  try {
    const { limit = 100, offset = 0, unpaged = false, type, scope, value, simulated, scenario, ip_address, country, ip_owner, only_active } = req.query;

    const where: any = {};
    
    if (type) {
      where.type = type;
    }
    
    if (scope) {
      where.scope = scope;
    }
    
    if (value) {
      where.value = { [Op.like]: `%${value}%` };
    }
    
    if (simulated !== undefined) {
      where.simulated = simulated;
    }

    // Filter by only active decisions (expiration > now)
    if (only_active) {
      const isActive = typeof only_active === 'boolean' ? only_active : only_active === 'true';
      if (isActive) {
        where.expiration = {
          [Op.gt]: new Date(),
        };
      }
    }

    // Filter by scenario (single or multiple)
    if (scenario) {
      const scenarios = Array.isArray(scenario) ? scenario : [scenario];
      where.scenario = {
        [Op.or]: scenarios.map(s => ({ [Op.like]: `%${s}%` }))
      };
    }

    // Filter by IP address (single or multiple)
    if (ip_address) {
      const ipAddresses = Array.isArray(ip_address) ? ip_address : [ip_address];
      where.value = {
        [Op.in]: ipAddresses
      };
    }

    // Fetch decisions with Alert relation if country or ip_owner filter is present
    const includeAlert = !!country || !!ip_owner;
    
    let decisions = await Decision.findAll({
      where,
      attributes: {
        exclude: ['created_at', 'updated_at']
      },
      include: includeAlert ? [{
        model: Alert,
        as: 'alert',
        attributes: ['source'],
      }] : [],
      order: [['crowdsec_created_at', 'DESC']],
      nest: includeAlert,
    });

    // Filter by country in JavaScript (since source is JSON in Alert)
    if (country) {
      const countries = Array.isArray(country) ? country : [country];
      const upperCountries = countries.map(c => String(c).toUpperCase());
      decisions = decisions.filter(decision => 
        decision.alert && 
        decision.alert.source && 
        decision.alert.source.cn && 
        upperCountries.includes(decision.alert.source.cn.toUpperCase())
      );
    }

    // Filter by IP owner/organization in JavaScript (since source is JSON in Alert)
    if (ip_owner) {
      const owners = Array.isArray(ip_owner) ? ip_owner : [ip_owner];
      decisions = decisions.filter(decision => 
        decision.alert && 
        decision.alert.source && 
        decision.alert.source.as_name && 
        owners.some(owner => decision.alert.source.as_name?.toLowerCase().includes(String(owner).toLowerCase()))
      );
    }

    const total = decisions.length;

    // Validate offset is not greater than total (only when paginated)
    if (!unpaged && (offset as number) > total) {
      res.status(400).json({
        message: `Invalid parameter: offset (${offset}) cannot be greater than total items (${total})`,
      });
      return;
    }

    // Apply pagination after filtering
    let paginatedDecisions = decisions;
    if (!unpaged) {
      paginatedDecisions = decisions.slice(offset as number, (offset as number) + (limit as number));
    }

    const response: any = {
      items: paginatedDecisions,
    };

    // Include pagination info only when paginated
    if (!unpaged) {
      const page = Math.floor((offset as number) / (limit as number)) + 1;
      response.pagination = {
        page,
        amount: paginatedDecisions.length,
        total,
      };
    } else {
      response.total = total;
    }

    res.json(response);
  } catch (error) {
    const response: any = {
      message: 'Error fetching decisions',
    };
    
    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    res.status(500).json(response);
  }
}
