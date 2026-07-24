import { describe, it, expect, vi } from 'vitest';
import { parseDuration, calculateExpiration, parseRetentionPeriod, calculateRetentionCutoff } from '@/utils/duration';

describe('parseDuration', () => {
  it('parses hours', () => {
    expect(parseDuration('4h')).toBe(4 * 60 * 60 * 1000);
  });

  it('parses mixed units', () => {
    expect(parseDuration('2h30m')).toBe(2 * 60 * 60 * 1000 + 30 * 60 * 1000);
  });

  it('parses decimal values', () => {
    expect(parseDuration('1.5d')).toBe(1.5 * 24 * 60 * 60 * 1000);
  });

  it('returns 0 for empty string', () => {
    expect(parseDuration('')).toBe(0);
  });

  it('returns 0 for null or undefined', () => {
    expect(parseDuration(null as unknown as string)).toBe(0);
    expect(parseDuration(undefined as unknown as string)).toBe(0);
  });

  it('returns 0 for unknown units (warns but no crash)', () => {
    const result = parseDuration('5x');
    expect(result).toBe(0);
  });

  it('parses mixed durations with hours, minutes', () => {
    expect(parseDuration('1d4h15m')).toBe(1 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000 + 15 * 60 * 1000);
  });

  it('handles negative durations', () => {
    const result = parseDuration('-1h');
    expect(result).toBeLessThan(0);
  });

  it('parses seconds', () => {
    expect(parseDuration('30s')).toBe(30 * 1000);
  });

  it('parses milliseconds', () => {
    expect(parseDuration('500ms')).toBe(500);
  });

  it('parses weeks', () => {
    expect(parseDuration('2w')).toBe(2 * 7 * 24 * 60 * 60 * 1000);
  });
});

describe('calculateExpiration', () => {
  it('adds duration to base date', () => {
    const base = new Date('2026-07-23T00:00:00Z');
    const result = calculateExpiration('4h', base);
    expect(result.toISOString()).toBe('2026-07-23T04:00:00.000Z');
  });

  it('uses current date when baseDate is not provided', () => {
    const before = Date.now();
    const result = calculateExpiration('1h');
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before + 60 * 60 * 1000);
    expect(result.getTime()).toBeLessThanOrEqual(after + 60 * 60 * 1000);
  });

  it('returns base date for empty duration', () => {
    const base = new Date('2026-07-23T00:00:00Z');
    const result = calculateExpiration('', base);
    expect(result.getTime()).toBe(base.getTime());
  });
});

describe('parseRetentionPeriod', () => {
  it('parses days', () => {
    expect(parseRetentionPeriod('1d')).toBe(24 * 60 * 60 * 1000);
  });

  it('parses weeks', () => {
    expect(parseRetentionPeriod('3w')).toBe(3 * 7 * 24 * 60 * 60 * 1000);
  });

  it('parses months (30 days)', () => {
    expect(parseRetentionPeriod('2m')).toBe(2 * 30 * 24 * 60 * 60 * 1000);
  });

  it('parses years (365 days)', () => {
    expect(parseRetentionPeriod('1y')).toBe(365 * 24 * 60 * 60 * 1000);
  });

  it('returns null for empty string', () => {
    expect(parseRetentionPeriod('')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseRetentionPeriod(undefined)).toBeNull();
  });

  it('returns null for invalid format', () => {
    expect(parseRetentionPeriod('abc')).toBeNull();
    expect(parseRetentionPeriod('1x')).toBeNull();
    expect(parseRetentionPeriod('1d2h')).toBeNull();
  });
});

describe('calculateRetentionCutoff', () => {
  it('calculates cutoff date for a given retention period', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-23T12:00:00Z'));

    const cutoff = calculateRetentionCutoff('1d');
    expect(cutoff).not.toBeNull();
    expect(cutoff!.toISOString()).toBe('2026-07-22T12:00:00.000Z');

    vi.useRealTimers();
  });

  it('returns null when retention is invalid', () => {
    expect(calculateRetentionCutoff('invalid')).toBeNull();
  });

  it('returns null when retention is undefined', () => {
    expect(calculateRetentionCutoff(undefined)).toBeNull();
  });
});
