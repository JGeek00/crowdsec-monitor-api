export const DB_MODE = {
  SQLITE: 'sqlite',
  POSTGRES: 'postgres',
} as const;
export type DbMode = typeof DB_MODE[keyof typeof DB_MODE];