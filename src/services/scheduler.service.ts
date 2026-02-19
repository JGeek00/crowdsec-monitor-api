type ScheduledTask = () => void | Promise<void>;

interface SchedulerOptions {
  intervalSeconds: number;
  runImmediately?: boolean;
}

interface ScheduledTaskInfo {
  id: string;
  task: ScheduledTask;
  intervalId: NodeJS.Timeout;
  isRunning: boolean;
  intervalSeconds: number;
}

/**
 * Scheduler Service
 * Provides an alternative to cron for high-frequency task scheduling (sub-minute intervals)
 */
class SchedulerService {
  private tasks: Map<string, ScheduledTaskInfo> = new Map();

  /**
   * Schedule a task to run at regular intervals
   * @param id Unique identifier for the task
   * @param task The function to execute on each interval
   * @param options Scheduler configuration
   */
  schedule(id: string, task: ScheduledTask, options: SchedulerOptions): void {
    // Stop existing task with the same id
    if (this.tasks.has(id)) {
      this.stopTask(id);
    }

    const intervalMs = options.intervalSeconds * 1000;

    console.log(`⏱️  Scheduler '${id}' started with ${options.intervalSeconds}s interval`);

    // Schedule the recurring task
    const intervalId = setInterval(() => {
      this.executeTask(id, task);
    }, intervalMs);

    // Store task info
    this.tasks.set(id, {
      id,
      task,
      intervalId,
      isRunning: false,
      intervalSeconds: options.intervalSeconds,
    });

    // Run immediately if requested (after storing task info)
    if (options.runImmediately) {
      this.executeTask(id, task);
    }
  }

  /**
   * Execute a scheduled task with error handling
   */
  private async executeTask(id: string, task: ScheduledTask): Promise<void> {
    const taskInfo = this.tasks.get(id);
    if (!taskInfo) {
      return;
    }

    // Prevent concurrent execution
    if (taskInfo.isRunning) {
      console.warn(`⚠️  Task '${id}' still running, skipping this interval`);
      return;
    }

    try {
      taskInfo.isRunning = true;
      await task();
    } catch (error) {
      console.error(`❌ Scheduled task '${id}' failed:`, error);
    } finally {
      taskInfo.isRunning = false;
    }
  }

  /**
   * Stop a specific task
   */
  stopTask(id: string): void {
    const taskInfo = this.tasks.get(id);
    if (taskInfo) {
      clearInterval(taskInfo.intervalId);
      this.tasks.delete(id);
      console.log(`⏱️  Scheduler '${id}' stopped`);
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stopAll(): void {
    for (const [id] of this.tasks) {
      this.stopTask(id);
    }
  }

  /**
   * Check if a specific task is active
   */
  isActive(id: string): boolean {
    return this.tasks.has(id);
  }

  /**
   * Check if a specific task is currently running
   */
  isTaskRunning(id: string): boolean {
    const taskInfo = this.tasks.get(id);
    return taskInfo ? taskInfo.isRunning : false;
  }

  /**
   * Get the number of active tasks
   */
  getActiveTaskCount(): number {
    return this.tasks.size;
  }
}

export const schedulerService = new SchedulerService();
