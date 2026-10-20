import { log, setLevel } from '@/services/log.service';
import type { Logger } from '@/application/ports/logger.port';

/** Application logger adapter over the legacy log service (until T10 slim). */
export class AppLogger implements Logger {
  error(...args: unknown[]): void {
    log.error(...args);
  }

  warn(...args: unknown[]): void {
    log.warn(...args);
  }

  info(...args: unknown[]): void {
    log.info(...args);
  }

  debug(...args: unknown[]): void {
    log.debug(...args);
  }
}

export { setLevel as setAppLogLevel };
