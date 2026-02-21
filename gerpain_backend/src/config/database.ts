import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/database/schema.js";

const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/base_backend_dev";
const isProduction = process.env.NODE_ENV === "production";

const isNeon = connectionString.includes("neon.tech");

const poolMax = process.env.DATABASE_POOL_MAX
  ? parseInt(process.env.DATABASE_POOL_MAX, 10)
  : isNeon
    ? 5
    : isProduction
      ? 20
      : 10;

const idleTimeout = process.env.DATABASE_IDLE_TIMEOUT
  ? parseInt(process.env.DATABASE_IDLE_TIMEOUT, 10)
  : 20;

const connectTimeout = process.env.DATABASE_CONNECT_TIMEOUT
  ? parseInt(process.env.DATABASE_CONNECT_TIMEOUT, 10)
  : 10;

const shouldUseSsl = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL === "true"
  : isNeon || isProduction;

// Production-ready connection pool configuration
const client = postgres(connectionString, {
  // Disable prefetch for "Transaction" pool mode (Neon, PgBouncer)
  prepare: false,
  
  // Connection pool settings
  max: poolMax, // Max connections in pool
  idle_timeout: idleTimeout, // Close idle connections after N seconds
  connect_timeout: connectTimeout, // Connection timeout in seconds
  
  // SSL: postgres-js expects a boolean or TLS options object (NOT a string).
  // Neon typically requires SSL; the pooled endpoint often uses a shared cert chain.
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  
  // Connection lifecycle hooks
  onnotice: () => {}, // Suppress notices in production
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  await client.end();
  console.log("Database connection closed");
}

process.on("SIGTERM", async () => {
  await closeDatabase();
});

process.on("SIGINT", async () => {
  await closeDatabase();
});

