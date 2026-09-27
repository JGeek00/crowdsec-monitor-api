import { describe, it, expect, vi } from 'vitest';
import {
  isCanonicalTimestamp,
  toCanonicalTimestamp,
  toCanonicalTimestampFromDate,
  toCanonicalFromUnknown,
  canonicalizeFields,
} from '@/utils/timestamp-format';
import {
  CANONICAL_PLUS_0200,
  CANONICAL_PLUS_0200_UTC,
  CANONICAL_NEGATIVE,
  CANONICAL_NEGATIVE_UTC,
  NAMED_ABBREVIATION,
  NAMED_ABBREVIATION_CANONICAL,
  DUPLICATED_OFFSET,
  DUPLICATED_OFFSET_CANONICAL,
  FRACTIONAL_SECONDS,
  FRACTIONAL_SECONDS_CANONICAL,
  UNPARSEABLE,
  EMPTY_VALUE,
  ISO_WITH_OFFSET,
  ISO_WITH_OFFSET_CANONICAL,
  ISO_UTC,
  ISO_UTC_CANONICAL,
} from '@tests/helpers/timestamp-fixtures';

const RFC3339_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

describe('isCanonicalTimestamp', () => {
  it('accepts the RFC 3339 UTC canonical form', () => {
    expect(isCanonicalTimestamp(ISO_UTC)).toBe(true);
  });

  it('rejects legacy duplicated-offset values (they are inputs, not canonical)', () => {
    expect(isCanonicalTimestamp(CANONICAL_PLUS_0200)).toBe(false);
    expect(isCanonicalTimestamp(CANONICAL_NEGATIVE)).toBe(false);
  });

  it('rejects the named-abbreviation upstream variant', () => {
    expect(isCanonicalTimestamp(NAMED_ABBREVIATION)).toBe(false);
  });

  it('rejects values with fractional seconds', () => {
    expect(isCanonicalTimestamp(FRACTIONAL_SECONDS)).toBe(false);
  });

  it('rejects RFC 3339 values with a numeric offset (not the UTC canonical form)', () => {
    expect(isCanonicalTimestamp(ISO_WITH_OFFSET)).toBe(false);
  });

  it('rejects unparseable, empty, and non-string values', () => {
    expect(isCanonicalTimestamp(UNPARSEABLE)).toBe(false);
    expect(isCanonicalTimestamp(EMPTY_VALUE)).toBe(false);
    expect(isCanonicalTimestamp(null)).toBe(false);
    expect(isCanonicalTimestamp(undefined)).toBe(false);
    expect(isCanonicalTimestamp(42)).toBe(false);
  });
});

describe('toCanonicalTimestamp', () => {
  it('passes an RFC 3339 UTC value through byte-identical (no re-serialization)', () => {
    expect(toCanonicalTimestamp(ISO_UTC)).toBe(ISO_UTC_CANONICAL);
  });

  it('converts the legacy duplicated-offset variant to UTC (single offset shift)', () => {
    expect(toCanonicalTimestamp(CANONICAL_PLUS_0200)).toBe(CANONICAL_PLUS_0200_UTC);
    expect(toCanonicalTimestamp(CANONICAL_NEGATIVE)).toBe(CANONICAL_NEGATIVE_UTC);
  });

  it('converts the named-abbreviation variant to UTC preserving the instant', () => {
    expect(toCanonicalTimestamp(NAMED_ABBREVIATION)).toBe(NAMED_ABBREVIATION_CANONICAL);
  });

  it('does not apply a double offset shift to the duplicated-offset variant', () => {
    expect(toCanonicalTimestamp(DUPLICATED_OFFSET)).toBe(DUPLICATED_OFFSET_CANONICAL);
  });

  it('truncates fractional seconds to whole seconds preserving the instant', () => {
    expect(toCanonicalTimestamp(FRACTIONAL_SECONDS)).toBe(FRACTIONAL_SECONDS_CANONICAL);
  });

  it('converts RFC 3339 values with numeric offset', () => {
    expect(toCanonicalTimestamp(ISO_WITH_OFFSET)).toBe(ISO_WITH_OFFSET_CANONICAL);
  });

  it('returns null for unparseable, empty and null values', () => {
    expect(toCanonicalTimestamp(UNPARSEABLE)).toBeNull();
    expect(toCanonicalTimestamp(EMPTY_VALUE)).toBeNull();
    expect(toCanonicalTimestamp(null)).toBeNull();
    expect(toCanonicalTimestamp(undefined)).toBeNull();
  });

  it('returns null for a value without an explicit offset (never invents a timezone)', () => {
    expect(toCanonicalTimestamp('2026-09-24 16:19:29')).toBeNull();
    expect(toCanonicalTimestamp('2026-09-24T16:19:29')).toBeNull();
  });

  it('returns null for an out-of-range offset', () => {
    expect(toCanonicalTimestamp('2026-09-24 16:19:29 +9969 HKT')).toBeNull();
  });

  it('is idempotent: converting an already-converted value is a no-op', () => {
    const once = toCanonicalTimestamp(NAMED_ABBREVIATION);
    expect(toCanonicalTimestamp(once)).toBe(once);
  });

  it('logs a failure with the record identity and original value when a context is given', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = toCanonicalTimestamp(UNPARSEABLE, { kind: 'alert', id: 42 });
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = String(warnSpy.mock.calls[0].join(' '));
      expect(message).toContain('alert');
      expect(message).toContain('42');
      expect(message).toContain(UNPARSEABLE);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('logs a failure identifying a decision when the context kind is decision', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      toCanonicalTimestamp(UNPARSEABLE, { kind: 'decision', id: 7 });
      const message = String(warnSpy.mock.calls[0].join(' '));
      expect(message).toContain('decision');
      expect(message).toContain('7');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('does not log when the value converts successfully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      toCanonicalTimestamp(NAMED_ABBREVIATION, { kind: 'alert', id: 1 });
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('toCanonicalTimestampFromDate', () => {
  it('renders a Date in RFC 3339 UTC regardless of the service timezone', () => {
    const date = new Date(Date.UTC(2026, 8, 24, 14, 31, 28));
    expect(toCanonicalTimestampFromDate(date)).toBe('2026-09-24T14:31:28Z');
  });

  it('preserves the instant: the rendered value is the exact UTC instant of the input', () => {
    const date = new Date(Date.UTC(2026, 8, 24, 14, 31, 28));
    const result = toCanonicalTimestampFromDate(date);
    expect(result).toMatch(RFC3339_UTC_PATTERN);
    expect(Date.parse(result)).toBe(date.getTime());
  });

  it('renders the same input date identically on repeated calls', () => {
    const date = new Date(Date.UTC(2026, 8, 24, 14, 31, 28));
    expect(toCanonicalTimestampFromDate(date)).toBe(toCanonicalTimestampFromDate(date));
  });
});

describe('toCanonicalFromUnknown', () => {
  it('renders Date values in the canonical RFC 3339 UTC shape', () => {
    const result = toCanonicalFromUnknown(new Date(Date.UTC(2026, 8, 24, 14, 31, 28)));
    expect(result).toBe('2026-09-24T14:31:28Z');
  });

  it('returns null and logs for invalid Date values (uninterpretable instant)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = toCanonicalFromUnknown(new Date('not-a-date'), { kind: 'alert', id: 3 });
      expect(result).toBeNull();
      const message = String(warnSpy.mock.calls[0].join(' '));
      expect(message).toContain('alert');
      expect(message).toContain('3');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('handles string values through the same canonical rules (passthrough, conversion, null)', () => {
    expect(toCanonicalFromUnknown(ISO_UTC)).toBe(ISO_UTC);
    expect(toCanonicalFromUnknown(CANONICAL_PLUS_0200)).toBe(CANONICAL_PLUS_0200_UTC);
    expect(toCanonicalFromUnknown(NAMED_ABBREVIATION)).toBe(NAMED_ABBREVIATION_CANONICAL);
    expect(toCanonicalFromUnknown(UNPARSEABLE, { kind: 'decision', id: 5 })).toBeNull();
    expect(toCanonicalFromUnknown(null)).toBeNull();
  });
});

describe('canonicalizeFields', () => {
  it('canonicalizes only the requested timestamp fields and leaves the rest untouched', () => {
    const entity = {
      id: 1,
      name: 'x',
      added_date: new Date(Date.UTC(2026, 8, 24, 14, 19, 29)),
      last_refresh_attempt: null,
      enabled: true,
    };
    const result = canonicalizeFields(entity, ['added_date', 'last_refresh_attempt']);
    expect(result.added_date).toBe('2026-09-24T14:19:29Z');
    expect(result.last_refresh_attempt).toBeNull();
    expect(result.id).toBe(1);
    expect(result.name).toBe('x');
    expect(result.enabled).toBe(true);
  });

  it('converts string fields through the canonical rules', () => {
    const result = canonicalizeFields({ ts: NAMED_ABBREVIATION }, ['ts'], { kind: 'alert', id: 1 });
    expect(result.ts).toBe(NAMED_ABBREVIATION_CANONICAL);
  });

  it('returns null for unconvertible fields and logs with the given context', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = canonicalizeFields({ ts: UNPARSEABLE }, ['ts'], { kind: 'decision', id: 8 });
      expect(result.ts).toBeNull();
      expect(String(warnSpy.mock.calls[0].join(' '))).toContain('decision');
    } finally {
      warnSpy.mockRestore();
    }
  });
});
