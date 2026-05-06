import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { Alert_SourceInfo, Decision, DecisionsTable, GetDecisionsQueryParams, GetDecisionsResponse, ResponseWithError } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { escapeLike } from '@/utils/sql';
import { DB_SORTING } from '@/types/database.types';

/**
 * Get all decisions with filtering and pagination
 * @param only_active - Optional boolean to filter only active decisions (expiration > now)
 */
type Res = ResponseWithError<GetDecisionsResponse>;
export async function getAllDecisions(req: Request<{}, Res, {}, GetDecisionsQueryParams>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { limit = 100, offset = 0, unpaged = false, type, scope, value, simulated, scenario, ip_address, country, ip_owner, only_active } = req.query;

    const where: WhereOptions<Decision> = {};
    
    if (type) {
      where.type = String(type);
    }
    
    if (scope) {
      where.scope = String(scope);
    }
    
    if (value) {
      where.value = { [Op.like]: `%${escapeLike(String(value))}%` };
    }
    
    if (simulated !== undefined) {
      where.simulated = String(simulated) === 'true';
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
        [Op.or]: scenarios.map(s => ({ [Op.like]: `%${escapeLike(String(s))}%` }))
      };
    }

    // Filter by IP address (single or multiple)
    if (ip_address) {
      const ipAddresses = Array.isArray(ip_address) ? ip_address : [ip_address];
      where.value = {
        [Op.in]: ipAddresses.map(String)
      };
    }

    // Fetch all decisions for filtering options (from entire database)
    const allDecisions = await DecisionsTable.findAll({
      attributes: ['source'],
      raw: true,
    });

    // Extract unique filtering options
    const countriesSet = new Set<string>();
    const ipOwnersSet = new Set<string>();

    allDecisions.forEach((decision) => {
      if (decision.source) {
        const source = typeof decision.source === 'string' ? JSON.parse(decision.source) as Alert_SourceInfo : decision.source;
        
        if (source.cn) {
          countriesSet.add(source.cn);
        }
        
        if (source.as_name) {
          ipOwnersSet.add(source.as_name);
        }
      }
    });

    // Fetch decisions with filters
    let decisions = await DecisionsTable.findAll({
      where,
      attributes: {
        exclude: [DecisionsTable.col.createdAt, DecisionsTable.col.updatedAt]
      },
      order: [[DecisionsTable.col.crowdsecCreatedAt, DB_SORTING.DESC]],
    });

    // Filter by country in JavaScript (since source is JSON)
    if (country) {
      const countries = Array.isArray(country) ? country : [country];
      const upperCountries = countries.map(c => String(c).toUpperCase());
      decisions = decisions.filter(decision => 
        decision.source && 
        decision.source.cn && 
        upperCountries.includes(decision.source.cn.toUpperCase())
      );
    }

    // Filter by IP owner/organization in JavaScript (since source is JSON)
    if (ip_owner) {
      const owners = Array.isArray(ip_owner) ? ip_owner : [ip_owner];
      decisions = decisions.filter(decision => 
        decision.source && 
        decision.source.as_name && 
        owners.some(owner => decision.source.as_name?.toLowerCase().includes(String(owner).toLowerCase()))
      );
    }

    const total = decisions.length;

    // Validate offset is not greater than total (only when paginated)
    if (!unpaged && (offset as number) > total) {
      res.status(400).json(errorResponse('Validation error', `Invalid parameter: offset (${offset}) cannot be greater than total items (${total})`));
      return;
    }

    // Apply pagination after filtering
    let paginatedDecisions = decisions;
    if (!unpaged) {
      paginatedDecisions = decisions.slice(offset as number, (offset as number) + (limit as number));
    }

    const response: GetDecisionsResponse = {
      filtering: {
        countries: Array.from(countriesSet).sort(),
        ipOwners: Array.from(ipOwnersSet).sort(),
      },
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
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching decisions', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
