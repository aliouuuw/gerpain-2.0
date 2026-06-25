import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'

import {
  ledgerAccounts,
  organizations,
  users,
} from '@gerpain/db/schema'
import * as schema from '@gerpain/db/schema'

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../db/drizzle',
)

export type TestDb = ReturnType<typeof drizzle<typeof schema>>

let seedCounter = 0

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite()
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder })
  return db
}

export async function seedOrganization(db: TestDb) {
  seedCounter += 1
  const suffix = seedCounter

  const [user] = await db
    .insert(users)
    .values({
      email: `ledger-${suffix}@test.local`,
      name: 'Ledger Test',
    })
    .returning()

  const [organization] = await db
    .insert(organizations)
    .values({
      name: `Test Org ${suffix}`,
      slug: `test-org-${suffix}`,
      ownerId: user!.id,
    })
    .returning()

  return { user: user!, organization: organization! }
}

export async function createAccount(
  db: TestDb,
  organizationId: string,
  code: string,
  type: 'asset' | 'liability' = 'asset',
) {
  const [account] = await db
    .insert(ledgerAccounts)
    .values({
      organizationId,
      code,
      name: code,
      type,
    })
    .returning()

  return account!
}
