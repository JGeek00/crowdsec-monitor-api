import { DomainError } from './domain.error';

/** Raised when an upstream system (CrowdSec LAPI, bouncer) is unreachable or failing. */
export class UpstreamUnavailableError extends DomainError {
  readonly kind = 'Upstream unavailable';
  readonly detail: string;

  constructor(detail = 'Upstream service is unavailable') {
    super(detail);
    this.detail = detail;
    this.name = 'UpstreamUnavailableError';
  }
}
