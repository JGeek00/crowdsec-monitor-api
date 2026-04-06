import { Request, Response } from 'express';
import { Alert, Decision } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { MetaData } from '@/models/Alert';
import { ParsedMetaData, AlertResponse } from '@/interfaces/alert.interface';

/**
 * Parse meta array values that might be JSON strings
 * Always returns value as an array of strings
 */
function parseMetaValues(meta: MetaData[]): ParsedMetaData[] {
  if (!Array.isArray(meta)) return meta;
  
  return meta.map(item => {
    if (item.value === undefined || item.value === null) {
      return { ...item, value: [] };
    }

    // If already an array, ensure all elements are strings
    if (Array.isArray(item.value)) {
      return { ...item, value: (item.value as unknown[]).map((v: unknown) => String(v)) };
    }

    // If it's a string, try to parse it
    if (typeof item.value === 'string') {
      try {
        const parsed: unknown = JSON.parse(item.value);
        // If parsed result is an array, convert all elements to strings
        if (Array.isArray(parsed)) {
          return { ...item, value: (parsed as unknown[]).map((v: unknown) => String(v)) };
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
 * Get alert by ID with associated decisions
 */
export async function getAlertById(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
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
      res.status(404).json(errorResponse('Not found', 'Alert not found'));
      return;
    }

    // Convert to plain object and remove timestamps
    const plainAlert = alert.toJSON() as unknown as AlertResponse;

    // Parse meta values
    if (plainAlert.meta && Array.isArray(plainAlert.meta)) {
      plainAlert.meta = parseMetaValues(plainAlert.meta as unknown as MetaData[]);
    }

    // Parse meta values in events
    if (plainAlert.events && Array.isArray(plainAlert.events)) {
      plainAlert.events = plainAlert.events.map((event) => {
        if (event.meta && Array.isArray(event.meta)) {
          event.meta = parseMetaValues(event.meta as unknown as MetaData[]);
        }
        return event;
      });
    }

    // Clean decisions if present
    if (plainAlert.decisions) {
      plainAlert.decisions = plainAlert.decisions.map((decision) => {
        return decision;
      });
    }

    res.json(plainAlert);
  } catch (error) {
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching alert', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
