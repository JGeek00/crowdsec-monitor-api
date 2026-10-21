import { DomainError } from './domain.error';

export class NotFoundError extends DomainError {
  readonly kind = 'Not found';
  readonly detail: string;

  constructor(detail = 'Resource not found') {
    super(detail);
    this.detail = detail;
    this.name = 'NotFoundError';
  }
}
