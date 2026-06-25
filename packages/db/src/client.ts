import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema/index'

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://localhost:5432/gerpain_dev'

const isProduction = process.env.NODE_ENV === 'production'
const isNeon = connectionString.includes('neon.tech')

const poolMax = process.env.DATABASE_POOL_MAX
  ? Number.parseInt(process.env.DATABASE_POOL_MAX, 10)
  : isNeon
    ? 5
    : isProduction
      ? 20
      : 10

const shouldUseSsl = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL === 'true'
  : isNeon || isProduction

const client = postgres(connectionString, {
  prepare: false,
  max: poolMax,
  idle_timeout: process.env.DATABASE_IDLE_TIMEOUT
    ? Number.parseInt(process.env.DATABASE_IDLE_TIMEOUT, 10)
    : 20,
  connect_timeout: process.env.DATABASE_CONNECT_TIMEOUT
    ? Number.parseInt(process.env.DATABASE_CONNECT_TIMEOUT, 10)
    : 10,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  onnotice: () => {},
})

export const db = drizzle(client, { schema })

export type Database = typeof db

export async function closeDatabase(): Promise<void> {
  await client.end()
}
