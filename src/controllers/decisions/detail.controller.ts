import { Request, Response } from 'express';
import { Decision, Alert } from '../../models';

/**
 * Parse meta array values that might be JSON strings
 * Always returns value as an array
 */
function parseMetaValues(meta: any[]): any[] {
  if (!Array.isArray(meta)) return meta;
  
  return meta.map(item => {
    if (item.value === undefined || item.value === null) {
      return { ...item, value: [] };
    }

    // If already an array, return as is
    if (Array.isArray(item.value)) {
      return item;
    }

    // If it's a string, try to parse it
    if (typeof item.value === 'string') {
      try {
        const parsed = JSON.parse(item.value);
        // If parsed result is an array, use it; otherwise wrap in array
        return { ...item, value: Array.isArray(parsed) ? parsed : [parsed] };
      } catch {
        // If parsing fails, wrap the string in an array
        return { ...item, value: [item.value] };
      }
    }

    // For any other type, wrap in array
    return { ...item, value: [item.value] };
  });
}

/**
 * Get decision by ID with associated alert
 */
export async function getDecisionById(req: Request, res: Response): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const decision = await Decision.findByPk(id, {
      attributes: {
        exclude: ['created_at', 'updated_at']
      },
      include: [{
        model: Alert,
        as: 'alert',
        attributes: {
          exclude: ['created_at', 'updated_at']
        },
      }],
    });

    if (!decision) {
      res.status(404).json({
        message: 'Decision not found',
      });
      return;
    }

    // Convert to plain object and remove timestamps
    const plainDecision: any = decision.toJSON();

    // Parse meta values in associated alert
    if (plainDecision.alert) {
      if (plainDecision.alert.meta && Array.isArray(plainDecision.alert.meta)) {
        plainDecision.alert.meta = parseMetaValues(plainDecision.alert.meta);
      }

      // Parse meta values in alert events
      if (plainDecision.alert.events && Array.isArray(plainDecision.alert.events)) {
        plainDecision.alert.events = plainDecision.alert.events.map((event: any) => {
          if (event.meta && Array.isArray(event.meta)) {
            event.meta = parseMetaValues(event.meta);
          }
          return event;
        });
      }
    }

    res.json(plainDecision);
  } catch (error) {
    const response: any = {
      message: 'Error fetching decision',
    };
    
    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    res.status(500).json(response);
  }
}
