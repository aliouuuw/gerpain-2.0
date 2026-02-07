import { db } from "../config/database.js";
import { sql } from "drizzle-orm";
import { execSync } from "child_process";

async function reset() {
  console.log("💥 Dropping all tables...");

  // Drop all tables in public schema
  await db.execute(sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  console.log("   All tables dropped.\n");

  // Re-run migrations
  console.log("🔨 Re-running migrations...");
  try {
    execSync("bun run db:migrate", { stdio: "inherit", cwd: process.cwd() });
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }

  console.log("\n✅ Database reset complete!");
  console.log("Run 'bun run db:seed' to populate with test data.");
  process.exit(0);
}

reset();
