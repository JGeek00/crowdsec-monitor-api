import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/services/log.service', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('SchedulerService', () => {
  afterEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules and runs a task on interval', async () => {
    vi.useFakeTimers();
    const { schedulerService } = await import('@/services/scheduler.service');
    const task = vi.fn();
    schedulerService.schedule('test', task, { intervalSeconds: 1 });
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(task).toHaveBeenCalledTimes(1);
    schedulerService.stopTask('test');
    vi.useRealTimers();
  });

  it('runs immediately when runImmediately is true', async () => {
    const { schedulerService } = await import('@/services/scheduler.service');
    const task = vi.fn().mockResolvedValue(undefined);
    schedulerService.schedule('immediate', task, { intervalSeconds: 60, runImmediately: true });
    await new Promise(process.nextTick);
    expect(task).toHaveBeenCalled();
    schedulerService.stopTask('immediate');
  });

  it('prevents concurrent task execution', async () => {
    const { schedulerService } = await import('@/services/scheduler.service');
    let release: () => void;
    const task = vi.fn().mockImplementation(
      () =>
        new Promise<void>((r) => {
          release = r;
        }),
    );
    schedulerService.schedule('conc', task, { intervalSeconds: 60, runImmediately: true });
    await new Promise(process.nextTick);
    expect(schedulerService.isTaskRunning('conc')).toBe(true);
    release!();
    await new Promise(process.nextTick);
    schedulerService.stopTask('conc');
  });

  it('stopTask removes the task', async () => {
    const { schedulerService } = await import('@/services/scheduler.service');
    const task = vi.fn();
    schedulerService.schedule('stop-me', task, { intervalSeconds: 10 });
    expect(schedulerService.isActive('stop-me')).toBe(true);
    schedulerService.stopTask('stop-me');
    expect(schedulerService.isActive('stop-me')).toBe(false);
  });

  it('stopAll stops all tasks', async () => {
    const { schedulerService } = await import('@/services/scheduler.service');
    schedulerService.schedule('a', vi.fn(), { intervalSeconds: 10 });
    schedulerService.schedule('b', vi.fn(), { intervalSeconds: 20 });
    schedulerService.stopAll();
    expect(schedulerService.isActive('a')).toBe(false);
    expect(schedulerService.isActive('b')).toBe(false);
  });

  it('isActive returns false for unknown task', async () => {
    const { schedulerService } = await import('@/services/scheduler.service');
    expect(schedulerService.isActive('nope')).toBe(false);
  });

  it('isTaskRunning returns false for unknown task', async () => {
    const { schedulerService } = await import('@/services/scheduler.service');
    expect(schedulerService.isTaskRunning('nope')).toBe(false);
  });

  it('getActiveTaskCount returns correct count', async () => {
    const { schedulerService } = await import('@/services/scheduler.service');
    schedulerService.schedule('x', vi.fn(), { intervalSeconds: 5 });
    expect(schedulerService.getActiveTaskCount()).toBe(1);
    schedulerService.stopAll();
  });

  it('reschedules by stopping existing task with same id', async () => {
    const { schedulerService } = await import('@/services/scheduler.service');
    const task1 = vi.fn();
    const task2 = vi.fn();
    schedulerService.schedule('dup', task1, { intervalSeconds: 10 });
    schedulerService.schedule('dup', task2, { intervalSeconds: 10 });
    expect(schedulerService.isActive('dup')).toBe(true);
    schedulerService.stopTask('dup');
    expect(schedulerService.isActive('dup')).toBe(false);
  });

  it('handles task errors gracefully', async () => {
    const { schedulerService } = await import('@/services/scheduler.service');
    const task = vi.fn().mockRejectedValue(new Error('task failed'));
    schedulerService.schedule('err-task', task, { intervalSeconds: 60, runImmediately: true });
    await new Promise(process.nextTick);
    expect(task).toHaveBeenCalled();
    expect(schedulerService.isTaskRunning('err-task')).toBe(false);
    schedulerService.stopTask('err-task');
  });

  it('stopTask on unknown id does nothing', async () => {
    const { schedulerService } = await import('@/services/scheduler.service');
    expect(() => schedulerService.stopTask('nonexistent')).not.toThrow();
  });
});
