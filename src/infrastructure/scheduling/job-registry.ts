import { schedulerService } from './interval-scheduler';
import { config } from '@/config';
import type { JobDefinition } from '@/application/jobs';

/**
 * Central job table (stable ids live in appDefaults.scheduler).
 * Receives fully-built job definitions from the composition root (app.ts):
 * everySeconds come from config, runOnBoot maps to the scheduler's
 * runImmediately.
 */
export class JobRegistry {
  private readonly jobs: JobDefinition[];

  constructor(jobs: JobDefinition[]) {
    this.jobs = jobs;
  }

  /** Schedules every job (legacy order preserved: lapi, sync, version, blocklists, cs-blocklists). */
  startAll(): void {
    for (const job of this.jobs) {
      schedulerService.schedule(job.id, job.run, {
        intervalSeconds: job.everySeconds,
        runImmediately: job.runOnBoot,
      });
    }
  }

  stopAll(): void {
    schedulerService.stopAll();
  }
}
