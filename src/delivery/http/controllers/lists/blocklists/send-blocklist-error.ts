import { Response } from 'express';
import { errorResponse } from '@/delivery/http/error-response';
import type { Logger } from '@/application/ports/logger.port';
import {
  ServiceUnavailableError,
  UpstreamUnavailableError,
  ValidationError,
  ConflictError,
  NotFoundError,
} from '@/domain/errors';

/**
 * Shared error mapping for blocklist/allowlist endpoints:
 * preserves the exact status codes and kinds of the legacy controllers.
 */
export function sendBlocklistError(
  res: Response,
  err: unknown,
  fallbackKind: string,
  fallbackMessage: string,
  log: Logger,
  label: string,
): void {
  if (err instanceof ServiceUnavailableError) {
    res.status(503).json(errorResponse(err.kind, err.detail));
    return;
  }
  if (err instanceof UpstreamUnavailableError) {
    res.status(500).json(errorResponse('CrowdSec connection error', err.detail));
    return;
  }
  if (err instanceof ValidationError) {
    res.status(400).json(errorResponse(err.kind, err.detail));
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json(errorResponse(err.kind, err.detail));
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json(errorResponse('Not found', err.detail));
    return;
  }
  log.error(label, err);
  res.status(500).json(errorResponse(fallbackKind, err instanceof Error ? err.message : fallbackMessage));
}
