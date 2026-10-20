export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug';

// Implemented by: infrastructure/system/app-logger.ts
// Called by: application/use-cases/*, application/jobs/*
export interface Logger {
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
}
