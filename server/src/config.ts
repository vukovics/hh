/**
 * Runtime configuration, read once from the environment.
 * Defaults match the local docker-compose Postgres.
 */
export const config = {
  port: Number(process.env.PORT ?? 3000),
  database: {
    host: process.env.PGHOST ?? 'localhost',
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? 'happyhotel',
    password: process.env.PGPASSWORD ?? 'happyhotel',
    database: process.env.PGDATABASE ?? 'happyhotel',
  },
} as const;
