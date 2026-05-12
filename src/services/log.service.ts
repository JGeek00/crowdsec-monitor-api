import { LogLevel, LOG_LEVELS } from "@/types/log.types";

let currentLevel: LogLevel = "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export function setLevel(level: LogLevel): void {
  if (!(level in LOG_LEVELS)) {
    throw new Error(`Invalid log level: ${level}`);
  }
  currentLevel = level;
}

export const log = {
  debug: (...args: unknown[]) => {
    if (shouldLog("debug")) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (shouldLog("info")) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (shouldLog("warn")) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (shouldLog("error")) console.error(...args);
  },
};
