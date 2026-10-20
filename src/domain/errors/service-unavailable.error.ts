import { DomainError } from './domain.error';

/** Temporary unavailability of a local subsystem (e.g. blocklist refresh in progress). */
export class ServiceUnavailableError extends DomainError {
  readonly kind = 'Service Unavailable';
  readonly detail: string;

  constructor(detail = 'Service temporarily unavailable') {
    super(detail);
    this.detail = detail;
    this.name = 'ServiceUnavailableError';
  }
}
