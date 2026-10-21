import { DomainError } from './domain.error';

/** Business validation failure (distinct from syntactic schema validation in delivery). */
export class ValidationError extends DomainError {
  readonly kind = 'Validation error';
  readonly detail: string;

  constructor(detail = 'Validation error') {
    super(detail);
    this.detail = detail;
    this.name = 'ValidationError';
  }
}
