#!/usr/bin/env bun
/**
 * Generate bcrypt password hash for migrated user
 * Run: bun run scripts/set-password.ts odee@bmanka.com "Odee123@"
 */

import { hashSync } from "bcryptjs";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: bun run scripts/set-password.ts <email> <password>");
  process.exit(1);
}

// Generate bcrypt hash (cost factor 10 is standard)
const hashedPassword = hashSync(password, 10);

console.log("\n=== SQL to run in Neon SQL Editor ===\n");
console.log(`UPDATE users`);
console.log(`SET hashed_password = '${hashedPassword}',`);
console.log(`    updated_at = now()`);
console.log(`WHERE email = '${email}';`);
console.log("\n=====================================\n");
