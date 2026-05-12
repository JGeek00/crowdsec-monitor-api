import { RequestHandler } from 'express';
import { log } from '@/services/log.service';

/**
 * Middleware factory to mark routes as deprecated.
 * Sets standard headers and logs a warning.
 */
export const deprecate = (newPath: string): RequestHandler => (req, res, next) => {
  try {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Link', `<${newPath}>; rel="deprecation"`);
    res.setHeader('X-Deprecation-Info', `This endpoint is deprecated. Use ${newPath} instead.`);
    log.warn(`Deprecated endpoint ${req.method} ${req.originalUrl} - use ${newPath}`);
  } catch {
    // ignore header-setting errors
  }
  next();
};
