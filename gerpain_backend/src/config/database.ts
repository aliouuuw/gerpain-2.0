import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/database/schema.js";

const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/base_backend_dev";

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

export type Database = typeof db;

