import { log } from '@/services/log.service';

/**
 * Canonical timestamp format: RFC 3339 UTC — `2026-09-27T10:40:36Z` — second
 * precision, `Z` designator. All delivered timestamps are normalized to UTC so
 * any standard client parser (java.time, ISO8601DateFormatter, JS Date) works
 * without custom code.
 */
const CANONICAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/** Go-style upstream variant: `2026-09-23 20:31:28 +0800 HKT` (optional fractional seconds, optional zone token). */
const UPSTREAM_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d+))? ([+-]\d{4})(?: \S+)?$/;

/** RFC 3339 variant: `2026-07-23T00:00:00Z` / `2026-07-23T00:00:00+02:00` (optional fractional seconds). */
const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;

export interface TimestampFailureContext {
  kind: 'alert' | 'decision';
  id: number | string;
}

interface ParsedTimestamp {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** Original UTC offset in minutes east of Greenwich (e.g. +120 for +0200). */
  offsetMinutes: number;
}

export function isCanonicalTimestamp(value: unknown): value is string {
  return typeof value === 'string' && CANONICAL_PATTERN.test(value);
}

function parseOffset(code: string): number | null {
  const sign = code[0] === '-' ? -1 : 1;
  const hours = Number(code.slice(1, 3));
  const minutes = Number(code.slice(3, 5));
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) return null;
  return sign * (hours * 60 + minutes);
}

function parseIsoOffset(group: string): number | null {
  if (group === 'Z') return 0;
  return parseOffset(group.replace(':', ''));
}

/**
 * Compute the UTC instant for wall-clock components, assigning the year literally.
 * `Date.UTC` maps years 0-99 to 1900+year, so years below 100 (e.g. the CrowdSec
 * "never expires" sentinel `0001-01-01`) would silently shift to 1901+; `setUTCFullYear`
 * assigns the requested year as-is. Returns null when the components roll over into a
 * different calendar date (out-of-range or non-existent dates).
 */
function utcInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): number | null {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return null;
  }
  return date.getTime();
}

function buildParsed(match: RegExpMatchArray, offsetMinutes: number | null): ParsedTimestamp | null {
  if (offsetMinutes === null) return null;
  const parsed: ParsedTimestamp = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
    offsetMinutes,
  };
  // Reject out-of-range and non-existent calendar dates via component round-trip
  if (utcInstant(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute, parsed.second) === null) {
    return null;
  }
  return parsed;
}

/**
 * Parse a timestamp value in any format delivered by the upstream CrowdSec API
 * (named-abbreviation, duplicated numeric offset) or in RFC 3339 form.
 * Returns the wall-clock components as written plus the original UTC offset,
 * or null when the value carries no explicit offset or is not a valid instant.
 */
export function parseTimestamp(value: string | null | undefined): ParsedTimestamp | null {
  if (typeof value !== 'string' || value.length === 0) return null;

  const upstreamMatch = value.match(UPSTREAM_PATTERN);
  if (upstreamMatch) return buildParsed(upstreamMatch, parseOffset(upstreamMatch[8]));

  const isoMatch = value.match(ISO_PATTERN);
  if (isoMatch) return buildParsed(isoMatch, parseIsoOffset(isoMatch[8]));

  return null;
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/**
 * Render parsed wall-clock components with their original UTC offset as an
 * RFC 3339 UTC string (`YYYY-MM-DDTHH:MM:SSZ`).
 */
function render(parsed: ParsedTimestamp): string {
  const base = utcInstant(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute, parsed.second);
  if (base === null) {
    throw new Error(`Invalid timestamp components: ${JSON.stringify(parsed)}`);
  }
  const utc = new Date(base - parsed.offsetMinutes * 60_000);
  return (
    `${pad(utc.getUTCFullYear(), 4)}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}` +
    `T${pad(utc.getUTCHours())}:${pad(utc.getUTCMinutes())}:${pad(utc.getUTCSeconds())}Z`
  );
}

/**
 * Convert any accepted timestamp value to the canonical format.
 * - Values already canonical pass through byte-identical (no re-serialization).
 * - Otherwise the value is parsed and re-rendered preserving the instant and original offset.
 * - Values that cannot be interpreted as an instant yield null; when a failure context is
 *   given, the failure is reported through the server log identifying the record.
 */
export function toCanonicalTimestamp(
  value: string | null | undefined,
  context?: TimestampFailureContext,
): string | null {
  if (isCanonicalTimestamp(value)) return value;

  const parsed = parseTimestamp(value);
  if (!parsed) {
    if (context) {
      log.warn(
        `Timestamp conversion failed for ${context.kind} #${context.id}: could not parse value "${String(value)}"`,
      );
    }
    return null;
  }

  return render(parsed);
}

/**
 * Render a Date-typed timestamp (backend-generated values) in the canonical
 * RFC 3339 UTC format.
 */
export function toCanonicalTimestampFromDate(date: Date): string {
  return render({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    offsetMinutes: 0,
  });
}

/**
 * Render a timestamp value of unknown runtime type (Date-typed column or string
 * from upstream/JSON storage) in the canonical format. Invalid dates and
 * unconvertible strings yield null, reporting the failure when a context is given.
 */
export function toCanonicalFromUnknown(
  value: Date | string | null | undefined,
  context?: TimestampFailureContext,
): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      if (context) {
        log.warn(
          `Timestamp conversion failed for ${context.kind} #${context.id}: could not parse value "${String(value)}"`,
        );
      }
      return null;
    }
    return toCanonicalTimestampFromDate(value);
  }
  return toCanonicalTimestamp(value, context);
}

/**
 * Render the given timestamp fields of an entity in the canonical format,
 * leaving every other field untouched. The mapped type turns each canonicalized
 * field into `string | null` (its delivered representation).
 */
type Canonicalized<T, K extends keyof T> = Omit<T, K> & { [P in K]: string | null };

export function canonicalizeFields<T extends object, K extends keyof T>(
  entity: T,
  fields: ReadonlyArray<K>,
  context?: TimestampFailureContext,
): Canonicalized<T, K> {
  const result = { ...entity } as Record<string, unknown>;
  for (const field of fields) {
    result[field as string] = toCanonicalFromUnknown(
      result[field as string] as Date | string | null | undefined,
      context,
    );
  }
  return result as Canonicalized<T, K>;
}
