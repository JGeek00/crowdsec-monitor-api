import { describe, it, expect } from 'vitest';
import { parseTimestampRange, TIMESTAMP_RANGE_PATTERN, TIMESTAMP_RANGE_FORMAT } from '@/shared/utils/timestamp-range';
import { ValidationError } from '@/domain/errors';

const utc = (iso: string) => new Date(iso);

describe('parseTimestampRange', () => {
  it('exports the documented wire format', () => {
    expect(TIMESTAMP_RANGE_FORMAT).toBe('yyyy-MM-dd:hh:mm:ss');
    expect(TIMESTAMP_RANGE_PATTERN.test('2020-01-02:03:04:05')).toBe(true);
    expect(TIMESTAMP_RANGE_PATTERN.test('2020-01-02T03:04:05')).toBe(false);
  });

  it('returns an empty range when both params are absent', () => {
    expect(parseTimestampRange({})).toEqual({});
    expect(parseTimestampRange({ start_timestamp: undefined, end_timestamp: undefined })).toEqual({});
  });

  it('parses start_timestamp as a UTC instant', () => {
    const range = parseTimestampRange({ start_timestamp: '2020-01-02:03:04:05' });
    expect(range.start_timestamp).toEqual(utc('2020-01-02T03:04:05Z'));
    expect(range.end_timestamp).toBeUndefined();
  });

  it('parses end_timestamp as a UTC instant', () => {
    const range = parseTimestampRange({ end_timestamp: '2020-06-15:12:00:00' });
    expect(range.end_timestamp).toEqual(utc('2020-06-15T12:00:00Z'));
    expect(range.start_timestamp).toBeUndefined();
  });

  it('parses both params into Date instants', () => {
    const range = parseTimestampRange({ start_timestamp: '2020-01-01:00:00:00', end_timestamp: '2020-01-31:23:59:59' });
    expect(range.start_timestamp).toEqual(utc('2020-01-01T00:00:00Z'));
    expect(range.end_timestamp).toEqual(utc('2020-01-31T23:59:59Z'));
  });

  it('accepts the leap day of a leap year', () => {
    const range = parseTimestampRange({ start_timestamp: '2020-02-29:00:00:00' });
    expect(range.start_timestamp).toEqual(utc('2020-02-29T00:00:00Z'));
  });

  it('accepts the boundary second of each field (23:59:59)', () => {
    const range = parseTimestampRange({ start_timestamp: '2021-12-31:23:59:59' });
    expect(range.start_timestamp).toEqual(utc('2021-12-31T23:59:59Z'));
  });

  it('rejects non-string values', () => {
    expect(() => parseTimestampRange({ start_timestamp: 1234567890 })).toThrow(ValidationError);
    expect(() => parseTimestampRange({ start_timestamp: ['2020-01-01:00:00:00'] })).toThrow(ValidationError);
  });

  it.each([
    '2020-01-01T00:00:00', // ISO separator instead of the documented colon
    '2020-01-01 00:00:00', // space separator instead of the documented colon
    '2020-01-01', // date only
    '2020-1-1:00:00:00', // unpadded fields
    '2020-01-01:00:00', // missing seconds
    '2020-01-01:00:00:00.500', // fractional seconds
    '20-01-01:00:00:00', // short year
  ])('rejects the malformed value %s', (value) => {
    expect(() => parseTimestampRange({ start_timestamp: value })).toThrow(ValidationError);
  });

  it.each([
    '2020-13-01:00:00:00', // month 13
    '2020-00-10:00:00:00', // month 00
    '2020-01-32:00:00:00', // day 32
    '2020-02-30:00:00:00', // February 30
    '2019-02-29:00:00:00', // non-leap year
    '2020-01-01:24:00:00', // hour 24
    '2020-01-01:00:60:00', // minute 60
    '2020-01-01:00:00:60', // second 60
  ])('rejects the impossible calendar value %s', (value) => {
    expect(() => parseTimestampRange({ start_timestamp: value })).toThrow(ValidationError);
  });

  it('names the offending param and the documented format in the error detail', () => {
    expect(() => parseTimestampRange({ start_timestamp: 'nonsense' })).toThrow(
      /start_timestamp.*yyyy-MM-dd:hh:mm:ss.*UTC/,
    );
    expect(() => parseTimestampRange({ end_timestamp: 'nonsense' })).toThrow(/end_timestamp.*yyyy-MM-dd:hh:mm:ss.*UTC/);
  });

  it('rejects end_timestamp equal to start_timestamp (must be later)', () => {
    expect(() =>
      parseTimestampRange({ start_timestamp: '2020-01-01:00:00:00', end_timestamp: '2020-01-01:00:00:00' }),
    ).toThrow(/end_timestamp.*later than start_timestamp/);
  });

  it('rejects end_timestamp earlier than start_timestamp', () => {
    expect(() =>
      parseTimestampRange({ start_timestamp: '2020-01-02:00:00:00', end_timestamp: '2020-01-01:00:00:00' }),
    ).toThrow(/end_timestamp.*later than start_timestamp/);
  });

  it('rejects a start_timestamp in the future', () => {
    const now = utc('2026-07-01T00:00:00Z');
    expect(() => parseTimestampRange({ start_timestamp: '2026-07-01:00:00:01' }, () => now)).toThrow(
      /start_timestamp.*in the future/,
    );
  });

  it('rejects an end_timestamp in the future', () => {
    const now = utc('2026-07-01T00:00:00Z');
    expect(() => parseTimestampRange({ end_timestamp: '2099-01-01:00:00:00' }, () => now)).toThrow(
      /end_timestamp.*in the future/,
    );
  });

  it('allows both params at exactly the current instant (not after now)', () => {
    const now = utc('2026-07-01T00:00:00Z');
    const range = parseTimestampRange(
      { start_timestamp: '2026-01-01:00:00:00', end_timestamp: '2026-07-01:00:00:00' },
      () => now,
    );
    expect(range.start_timestamp).toEqual(utc('2026-01-01T00:00:00Z'));
    expect(range.end_timestamp).toEqual(now);
  });
});
