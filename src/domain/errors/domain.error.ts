/** Base class for domain errors mapped to HTTP responses by the delivery error middleware. */
export abstract class DomainError extends Error {
  abstract readonly kind: string;
  /** Transport-agnostic detail, rendered by the delivery layer. */
  abstract readonly detail: string;
}
