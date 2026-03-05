/**
 * Check if a date string is valid
 * Dates like "0001-01-01T00:00:00.000Z" are considered invalid
 * @param dateString - ISO date string
 * @returns true if date is valid, false otherwise
 */
export function isValidDate(dateString: string | null): boolean {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid (not NaN)
    if (isNaN(date.getTime())) return false;
    
    // Check if date is the Unix epoch (invalid default date)
    // Common invalid date values like "0001-01-01"
    if (dateString.startsWith('0001-') || dateString.startsWith('1000-')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
