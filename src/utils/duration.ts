/**
 * Parse CrowdSec duration string and convert to milliseconds
 * Supports formats like: "4h", "30m", "2h30m", "1d", "1.5h", etc.
 * 
 * @param duration - Duration string from CrowdSec (e.g., "4h", "30m", "2h30m")
 * @returns Duration in milliseconds
 */
export function parseDuration(duration: string): number {
  if (!duration || typeof duration !== 'string') {
    return 0;
  }

  // Match all numbers followed by time units
  const regex = /(-?[\d.]+)([a-z]+)/gi;
  let totalMs = 0;
  let match;

  while ((match = regex.exec(duration)) !== null) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'ns': // nanoseconds
        totalMs += value / 1000000;
        break;
      case 'us': // microseconds
      case 'µs':
        totalMs += value / 1000;
        break;
      case 'ms': // milliseconds
        totalMs += value;
        break;
      case 's': // seconds
        totalMs += value * 1000;
        break;
      case 'm': // minutes
        totalMs += value * 60 * 1000;
        break;
      case 'h': // hours
        totalMs += value * 60 * 60 * 1000;
        break;
      case 'd': // days
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
      case 'w': // weeks
        totalMs += value * 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        console.warn(`Unknown duration unit: ${unit}`);
    }
  }

  return Math.round(totalMs);
}

/**
 * Calculate expiration date from a duration string
 * 
 * @param duration - Duration string from CrowdSec (e.g., "4h", "30m")
 * @param baseDate - Base date to add duration to (defaults to current date)
 * @returns Expiration date
 */
export function calculateExpiration(duration: string, baseDate: Date = new Date()): Date {
  const durationMs = parseDuration(duration);
  return new Date(baseDate.getTime() + durationMs);
}
