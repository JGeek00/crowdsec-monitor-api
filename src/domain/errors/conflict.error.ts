import { DomainError } from './domain.error';

export class ConflictError extends DomainError {
  readonly kind = 'Conflict';
  readonly detail: string;

  constructor(detail = 'Resource conflict') {
    super(detail);
    this.detail = detail;
    this.name = 'ConflictError';
  }
}
