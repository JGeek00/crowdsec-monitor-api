/**
 * Escapes SQL LIKE wildcard characters (%, _, \) in a user-supplied string
 * to prevent wildcard injection in parameterized LIKE queries.
 */
export function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}
