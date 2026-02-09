import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "../config/database.js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/base_backend_dev";

async function main() {
  console.log("Running migrations...");
  
  const migrationClient = postgres(connectionString, { max: 1 });
  
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

main();


