/**
 * Async write lock that serializes concurrent write operations.
 * Ensures that database write operations do not overlap, preventing
 * race conditions during blocklist sync.
 */
export class AsyncWriteLock {
  private lock: Promise<void> = Promise.resolve();

  /**
   * Acquire the lock, execute the async function, then release.
   * If multiple calls overlap, they are queued and executed sequentially.
   */
  public acquire<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.lock.then(() => fn());
    this.lock = next.then(
      () => {},
      () => {},
    );
    return next;
  }
}
