import { db } from "../config/database.js";
import { sql } from "drizzle-orm";

async function wipe() {
  console.log("💥 Dropping all tables...");
  await db.execute(sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
  console.log("✅ Database wiped clean.");
  process.exit(0);
}

wipe();
