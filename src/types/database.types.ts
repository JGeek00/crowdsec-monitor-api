export const DB_MODE = {
  SQLITE: 'sqlite',
  POSTGRES: 'postgres',
} as const;
export type DbMode = (typeof DB_MODE)[keyof typeof DB_MODE];

export const DB_SORTING = {
  ASC: 'ASC',
  DESC: 'DESC',
} as const;
export type DBSorting = (typeof DB_SORTING)[keyof typeof DB_SORTING];

/**
 * Make the keys of `T` listed in `K` optional.
 *
 * Replacement for the `Optional` utility type that Sequelize v6 exported and
 * v7 (`@sequelize/core`) no longer provides. Used to type the creation
 * attributes of the DB models (auto-generated columns such as `id`).
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
