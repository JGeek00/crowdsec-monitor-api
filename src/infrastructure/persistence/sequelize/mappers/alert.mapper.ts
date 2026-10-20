import type { Alert, Alert_EventData, Alert_SourceInfo } from '@/domain/entities';
import type { UnparsedMetaData } from '@/shared/models';
import { parseAlertMeta } from '@/shared/utils/parse-meta-values';

type AlertRow = Alert<UnparsedMetaData>;

/**
 * Table ↔ Entity mapper for the alert aggregate (alert + its decisions).
 * Table rows may carry JSON columns as raw strings (raw queries); the mapper
 * normalizes them into the domain entity shape.
 */
export const AlertMapper = {
  /** Parses JSON-string columns (source/events/meta/labels) coming from raw queries. */
  toEntity(row: AlertRow): Alert<UnparsedMetaData> {
    const source = AlertMapper.parseJson<Alert_SourceInfo>(row.source);
    const events = AlertMapper.parseJson<Alert_EventData<UnparsedMetaData>[]>(row.events);
    const labels = typeof row.labels === 'string' ? (JSON.parse(row.labels) as string[] | null) : row.labels;
    return { ...row, source, events, labels };
  },

  /** Entity shaped for the API response: meta parsed from Unparsed → Parsed. */
  toResponse(row: AlertRow) {
    return parseAlertMeta(AlertMapper.toEntity(row));
  },

  parseJson<T>(value: unknown): T {
    return typeof value === 'string' ? (JSON.parse(value) as T) : (value as T);
  },
};
