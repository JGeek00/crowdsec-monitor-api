/**
 * Shared timestamp fixtures for the RFC 3339 UTC canonical timestamp format.
 *
 * Canonical format: RFC 3339 UTC, second precision, Z designator
 * (`2026-09-27T10:40:36Z`). Inputs may arrive in the legacy duplicated-offset
 * form, the Go-style named-abbreviation form, or RFC 3339; all normalize to UTC.
 */

/** Legacy DB/upstream row at UTC+2 (duplicated-offset form). */
export const CANONICAL_PLUS_0200 = '2026-09-24 16:19:29 +0200 +0200';

/** Expected RFC 3339 UTC result of converting CANONICAL_PLUS_0200. */
export const CANONICAL_PLUS_0200_UTC = '2026-09-24T14:19:29Z';

/** Legacy row at UTC-5 (duplicated-offset form). */
export const CANONICAL_NEGATIVE = '2026-09-23 14:31:28 -0500 -0500';

/** Expected RFC 3339 UTC result of converting CANONICAL_NEGATIVE. */
export const CANONICAL_NEGATIVE_UTC = '2026-09-23T19:31:28Z';

/** Upstream Go-style variant with a named zone abbreviation. */
export const NAMED_ABBREVIATION = '2026-09-23 20:31:28 +0800 HKT';

/** Expected RFC 3339 UTC result of converting NAMED_ABBREVIATION. */
export const NAMED_ABBREVIATION_CANONICAL = '2026-09-23T12:31:28Z';

/** Legacy duplicated-offset input (no longer a pass-through value). */
export const DUPLICATED_OFFSET = '2026-05-02 20:26:24 +0200 +0200';

/** CrowdSec "never expires" sentinel: a legacy row with a year below 100. */
export const NEVER_EXPIRES_SENTINEL = '0001-01-01 00:00:00 +0000 +0000';

/** Expected RFC 3339 UTC result of converting NEVER_EXPIRES_SENTINEL (year must stay 0001, not 1901). */
export const NEVER_EXPIRES_SENTINEL_UTC = '0001-01-01T00:00:00Z';

/** Expected RFC 3339 UTC result of converting DUPLICATED_OFFSET. */
export const DUPLICATED_OFFSET_CANONICAL = '2026-05-02T18:26:24Z';

/** Input carrying fractional seconds — must convert truncated to whole seconds. */
export const FRACTIONAL_SECONDS = '2026-09-24 16:19:29.500 +0200 +0200';

/** Expected RFC 3339 UTC result of converting FRACTIONAL_SECONDS. */
export const FRACTIONAL_SECONDS_CANONICAL = '2026-09-24T14:19:29Z';

/** Unparseable value — must convert to null (and be stored as received on the write path). */
export const UNPARSEABLE = 'not-a-timestamp';

/** Empty value — treated as unconvertible. */
export const EMPTY_VALUE = '';

/** RFC 3339 value with a numeric offset. */
export const ISO_WITH_OFFSET = '2026-07-23T00:00:00+02:00';

/** Expected RFC 3339 UTC result of converting ISO_WITH_OFFSET. */
export const ISO_WITH_OFFSET_CANONICAL = '2026-07-22T22:00:00Z';

/** RFC 3339 UTC value with `Z` designator — already canonical, passes through byte-identical. */
export const ISO_UTC = '2026-07-23T00:00:00Z';

/** Expected canonical result of converting ISO_UTC (identical to the input). */
export const ISO_UTC_CANONICAL = '2026-07-23T00:00:00Z';
