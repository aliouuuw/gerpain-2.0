import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/database/schema.js";

const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/base_backend_dev";
const isProduction = process.env.NODE_ENV === "production";

// Production-ready connection pool configuration
const client = postgres(connectionString, {
  // Disable prefetch for "Transaction" pool mode (Neon, PgBouncer)
  prepare: false,
  
  // Connection pool settings
  max: isProduction ? 20 : 10, // Max connections in pool
  idle_timeout: 20, // Close idle connections after 20s
  connect_timeout: 10, // Connection timeout in seconds
  
  // SSL for production (Neon requires this)
  ssl: isProduction ? "require" : false,
  
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

