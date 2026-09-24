/**
 * Shared timestamp fixtures for the canonical timestamp format feature.
 *
 * Canonical format: `YYYY-MM-DD HH:MM:SS ±ZZZZ ZZZ` (second precision, offset repeated as zone).
 * See specs/006-fix-timestamp-format/contracts/timestamp-format.md.
 */

/** Canonical value at UTC+2 (the duplicated-offset form observed upstream). */
export const CANONICAL_PLUS_0200 = '2026-09-24 16:19:29 +0200 +0200';

/** Canonical value at UTC-5 (negative offset). */
export const CANONICAL_NEGATIVE = '2026-09-23 14:31:28 -0500 -0500';

/** Upstream variant with a named zone abbreviation — must convert to `2026-09-23 20:31:28 +0800 +0800`. */
export const NAMED_ABBREVIATION = '2026-09-23 20:31:28 +0800 HKT';

/** Expected canonical result of converting NAMED_ABBREVIATION. */
export const NAMED_ABBREVIATION_CANONICAL = '2026-09-23 20:31:28 +0800 +0800';

/** Upstream variant with duplicated numeric offset — already canonical, must pass through unchanged. */
export const DUPLICATED_OFFSET = '2026-05-02 20:26:24 +0200 +0200';

/** Input carrying fractional seconds — must convert truncated to whole seconds. */
export const FRACTIONAL_SECONDS = '2026-09-24 16:19:29.500 +0200 +0200';

/** Expected canonical result of converting FRACTIONAL_SECONDS. */
export const FRACTIONAL_SECONDS_CANONICAL = '2026-09-24 16:19:29 +0200 +0200';

/** Unparseable value — must convert to null (and be stored as received on the write path). */
export const UNPARSEABLE = 'not-a-timestamp';

/** Empty value — treated as unconvertible. */
export const EMPTY_VALUE = '';

/** Value with an explicit offset but no zone suffix (RFC 3339 style with numeric offset). */
export const ISO_WITH_OFFSET = '2026-07-23T00:00:00+02:00';

/** Expected canonical result of converting ISO_WITH_OFFSET. */
export const ISO_WITH_OFFSET_CANONICAL = '2026-07-23 00:00:00 +0200 +0200';

/** Value with `Z` designator (UTC). */
export const ISO_UTC = '2026-07-23T00:00:00Z';

/** Expected canonical result of converting ISO_UTC. */
export const ISO_UTC_CANONICAL = '2026-07-23 00:00:00 +0000 +0000';
