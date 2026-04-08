import type { AlertWithParsedMeta, ParsedMetaData } from "@/interfaces/alert.interface";
import type { AlertAttributes, MetaData } from "@/models/Alert";

/**
 * Parse meta array values that might be JSON strings
 * Always returns value as an array of strings
 */
function parseMetaValues(meta: MetaData[]): ParsedMetaData[] {
  if (!Array.isArray(meta)) return meta;
  
  return meta.map(item => {
    if (item.value === undefined || item.value === null) {
      return { ...item, value: [] };
    }

    // If already an array, ensure all elements are strings
    if (Array.isArray(item.value)) {
      return { ...item, value: (item.value as unknown[]).map((v: unknown) => String(v)) };
    }

    // If it's a string, try to parse it
    if (typeof item.value === 'string') {
      try {
        const parsed: unknown = JSON.parse(item.value);
        // If parsed result is an array, convert all elements to strings
        if (Array.isArray(parsed)) {
          return { ...item, value: (parsed as unknown[]).map((v: unknown) => String(v)) };
        }
        // If it's not an array, stringify it and wrap in array
        return { ...item, value: [String(parsed)] };
      } catch {
        // If parsing fails, wrap the string in an array
        return { ...item, value: [item.value] };
      }
    }

    // For any other type, convert to string and wrap in array
    return { ...item, value: [String(item.value)] };
  });
}

export function parseAlertMeta(raw: AlertAttributes): AlertWithParsedMeta {
  return {
    ...raw,
    meta: Array.isArray(raw.meta) ? parseMetaValues(raw.meta) : [],
    events: Array.isArray(raw.events)
      ? raw.events.map((event) => ({
          ...event,
          meta: Array.isArray(event.meta) ? parseMetaValues(event.meta) : [],
        }))
      : [],
  };
}
