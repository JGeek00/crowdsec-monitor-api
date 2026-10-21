import type { Clock } from '@/application/ports/clock.port';

/** System clock adapter for the Clock port. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export const systemClock = new SystemClock();
