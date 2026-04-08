export const DB_MODE = {
  SQLITE: 'sqlite',
  POSTGRES: 'postgres',
} as const;
export type DbMode = typeof DB_MODE[keyof typeof DB_MODE];

export const DB_SORTING = {
  ASC: 'ASC',
  DESC: 'DESC',
} as const;
export type DBSorting = typeof DB_SORTING[keyof typeof DB_SORTING];