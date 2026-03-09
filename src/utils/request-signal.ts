import { Request } from 'express';

/**
 * Creates an AbortSignal tied to the lifecycle of an HTTP request.
 * The signal is aborted when the client closes/cancels the connection.
 *
 * Note: SQLite's native driver cannot cancel an in-progress query, so the
 * signal is NOT passed to Sequelize query options. Instead, it is used only
 * as an `aborted` guard in catch blocks to suppress error responses after
 * the client has already disconnected. Concurrent request isolation is
 * provided by the connection pool (pool.max > 1) together with WAL mode.
 *
 * Usage:
 *   const { signal, cleanup } = createRequestSignal(req);
 *   try {
 *     const result = await Model.findOne({ ... });
 *   } catch (error) {
 *     if (signal.aborted) return;
 *     // handle real errors
 *   } finally {
 *     cleanup();
 *   }
 */
export function createRequestSignal(req: Request): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const onClose = () => controller.abort();
  req.on('close', onClose);
  return {
    signal: controller.signal,
    cleanup: () => req.off('close', onClose),
  };
}
