import { ValidationError } from '@/domain/errors';

/** Wire format of the `start_timestamp` / `end_timestamp` list filters, always UTC. */
export const TIMESTAMP_RANGE_FORMAT = 'yyyy-MM-dd:hh:mm:ss';

export const TIMESTAMP_RANGE_PATTERN = /^\d{4}-\d{2}-\d{2}:\d{2}:\d{2}:\d{2}$/;

/** Range handed to the persistence layer after normalization. */
export interface ParsedTimestampRange {
  start_timestamp?: Date;
  end_timestamp?: Date;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Component parse: the regex alone accepts values like month 13 or February 30. */
function parseUtcTimestamp(param: 'start_timestamp' | 'end_timestamp', value: unknown): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !TIMESTAMP_RANGE_PATTERN.test(value)) {
    throw new ValidationError(
      `Invalid parameter: ${param} (${String(value)}) must follow the format ${TIMESTAMP_RANGE_FORMAT} in UTC`,
    );
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const hour = Number(value.slice(11, 13));
  const minute = Number(value.slice(14, 16));
  const second = Number(value.slice(17, 19));

  const daysInMonth = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
  const valid =
    month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth && hour <= 23 && minute <= 59 && second <= 59;
  if (!valid) {
    throw new ValidationError(
      `Invalid parameter: ${param} (${value}) must follow the format ${TIMESTAMP_RANGE_FORMAT} in UTC`,
    );
  }

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

/**
 * Validates and normalizes the optional `start_timestamp` / `end_timestamp` list
 * filters (format, end after start, none in the future; both UTC).
 */
export function parseTimestampRange(
  params: { start_timestamp?: unknown; end_timestamp?: unknown },
  now: () => Date = () => new Date(),
): ParsedTimestampRange {
  const start_timestamp = parseUtcTimestamp('start_timestamp', params.start_timestamp);
  const end_timestamp = parseUtcTimestamp('end_timestamp', params.end_timestamp);

  if (start_timestamp && end_timestamp && end_timestamp.getTime() <= start_timestamp.getTime()) {
    throw new ValidationError(
      `Invalid parameter: end_timestamp (${params.end_timestamp}) must be later than start_timestamp (${params.start_timestamp})`,
    );
  }

  const currentTime = now().getTime();
  if (start_timestamp && start_timestamp.getTime() > currentTime) {
    throw new ValidationError(`Invalid parameter: start_timestamp (${params.start_timestamp}) cannot be in the future`);
  }
  if (end_timestamp && end_timestamp.getTime() > currentTime) {
    throw new ValidationError(`Invalid parameter: end_timestamp (${params.end_timestamp}) cannot be in the future`);
  }

  return { start_timestamp, end_timestamp };
}
