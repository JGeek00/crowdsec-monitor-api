type ScheduledTask = () => void | Promise<void>;

interface SchedulerOptions {
  intervalSeconds: number;
  runImmediately?: boolean;
}

/**
 * Scheduler Service
 * Provides an alternative to cron for high-frequency task scheduling (sub-minute intervals)
 */
class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private task: ScheduledTask | null = null;

  /**
   * Schedule a task to run at regular intervals
   * @param task The function to execute on each interval
   * @param options Scheduler configuration
   */
  schedule(task: ScheduledTask, options: SchedulerOptions): void {
    if (this.intervalId) {
      this.stop();
    }

    this.task = task;
    const intervalMs = options.intervalSeconds * 1000;

    console.log(`⏱️  Scheduler started with ${options.intervalSeconds}s interval`);

    // Run immediately if requested
    if (options.runImmediately) {
      this.executeTask();
    }

    // Schedule the recurring task
    this.intervalId = setInterval(() => {
      this.executeTask();
    }, intervalMs);
  }

  /**
   * Execute the scheduled task with error handling
   */
  private async executeTask(): Promise<void> {
    if (!this.task) {
      return;
    }

    // Prevent concurrent execution
    if (this.isRunning) {
      console.warn('⚠️  Previous sync still running, skipping this interval');
      return;
    }

    try {
      this.isRunning = true;
      await this.task();
    } catch (error) {
      console.error('❌ Scheduled task failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏱️  Scheduler stopped');
    }
  }

  /**
   * Check if scheduler is active
   */
  isActive(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Check if a task is currently running
   */
  isTaskRunning(): boolean {
    return this.isRunning;
  }
}

export const schedulerService = new SchedulerService();
