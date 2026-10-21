/**
 * Human-readable scheduler interval formatting (h/m/s), shared by the
 * server bootstrap banner.
 */
export const formatInterval = (seconds: number): string => {
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
};
