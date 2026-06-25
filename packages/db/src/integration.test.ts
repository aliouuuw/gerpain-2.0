import { count, eq } from 'drizzle-orm'
import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'

import { db, closeDatabase } from './client'
import {
  organization as baOrganization,
  organizations,
  products,
  user,
} from './schema/index'

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://gerpain:gerpain@localhost:5432/gerpain_dev'

async function isDatabaseReachable(): Promise<boolean> {
  const sql = postgres(DATABASE_URL, {
    max: 1,
    connect_timeout: 3,
  })

  try {
    await sql`SELECT 1`
    return true
  } catch {
    return false
  } finally {
    await sql.end({ timeout: 1 })
  }
}

const dbReady = await isDatabaseReachable()

describe.skipIf(!dbReady)('local database integration', () => {
  afterAll(async () => {
    await closeDatabase()
  })

  it('has seeded Better Auth admin user', async () => {
    const admin = await db.query.user.findFirst({
      where: eq(user.email, 'admin@gerpain.com'),
    })

    expect(admin).toBeDefined()
    expect(admin?.name).toBe('Admin Gerpain')
  })

  it('has Better Auth and legacy organizations', async () => {
    const baOrg = await db.query.organization.findFirst({
      where: eq(baOrganization.slug, 'gerpain'),
    })
    const legacyOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, 'gerpain'),
    })

    expect(baOrg).toBeDefined()
    expect(legacyOrg).toBeDefined()

    const settings = legacyOrg?.settings
      ? (JSON.parse(legacyOrg.settings) as { betterAuthOrganizationId?: string })
      : {}

    expect(settings.betterAuthOrganizationId).toBe(baOrg?.id)
  })

  it('has bakery catalog seed data', async () => {
    const [row] = await db.select({ value: count() }).from(products)
    expect(row?.value).toBeGreaterThanOrEqual(9)
  })
})

if (!dbReady) {
  console.warn(
    `[db] Skipping integration tests — Postgres not reachable at ${DATABASE_URL}`,
  )
}
