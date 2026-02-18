import { Request, Response } from 'express';
import { Alert, Decision } from '../../models';

/**
 * Parse meta array values that might be JSON strings
 */
function parseMetaValues(meta: any[]): any[] {
  if (!Array.isArray(meta)) return meta;
  
  return meta.map(item => {
    if (item.value && typeof item.value === 'string') {
      try {
        // Try to parse the value if it's a JSON string
        const parsed = JSON.parse(item.value);
        return { ...item, value: parsed };
      } catch {
        // If parsing fails, keep the original value
        return item;
      }
    }
    return item;
  });
}

/**
 * Get alert by ID with associated decisions
 */
export async function getAlertById(req: Request, res: Response): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const alert = await Alert.findByPk(id, {
      attributes: {
        exclude: ['created_at', 'updated_at']
      },
      include: [{
        model: Decision,
        as: 'decisions',
        attributes: {
          exclude: ['created_at', 'updated_at']
        },
      }],
    });

    if (!alert) {
      res.status(404).json({
        message: 'Alert not found',
      });
      return;
    }

    // Convert to plain object and remove timestamps
    const plainAlert: any = alert.toJSON();

    // Parse meta values
    if (plainAlert.meta && Array.isArray(plainAlert.meta)) {
      plainAlert.meta = parseMetaValues(plainAlert.meta);
    }

    // Parse meta values in events
    if (plainAlert.events && Array.isArray(plainAlert.events)) {
      plainAlert.events = plainAlert.events.map((event: any) => {
        if (event.meta && Array.isArray(event.meta)) {
          event.meta = parseMetaValues(event.meta);
        }
        return event;
      });
    }

    // Clean decisions if present
    if (plainAlert.decisions) {
      plainAlert.decisions = plainAlert.decisions.map((decision: any) => {
        return decision;
      });
    }

    res.json(plainAlert);
  } catch (error) {
    const response: any = {
      message: 'Error fetching alert',
    };
    
    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    res.status(500).json(response);
  }
}
