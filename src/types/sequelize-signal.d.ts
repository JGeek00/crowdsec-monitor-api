/**
 * Extends Sequelize 6 types to include the `signal` option (AbortSignal),
 * which is supported at runtime since Sequelize 6.25 but absent from the
 * bundled type declarations.
 */
import 'sequelize';

declare module 'sequelize' {
  interface FindOptions<TAttributes = any> {
    signal?: AbortSignal;
  }
  interface CountOptions<TAttributes = any> {
    signal?: AbortSignal;
  }
  interface QueryOptions {
    signal?: AbortSignal;
  }
}
