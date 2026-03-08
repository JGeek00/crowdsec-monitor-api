import { Request } from 'express';

/**
 * Creates an AbortSignal tied to the lifecycle of an HTTP request.
 * The signal is aborted when the client closes/cancels the connection,
 * which allows in-flight Sequelize queries to be cancelled.
 *
 * Usage:
 *   const { signal, cleanup } = createRequestSignal(req);
 *   try {
 *     const result = await Model.findOne({ signal, ... });
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
