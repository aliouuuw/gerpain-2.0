import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db, closeDatabase } from './client'
import { runSeed } from './scripts/seed-core'
import {
  organization as baOrganization,
  organizations,
  products,
  user,
} from './schema/index'
import { legacyOrganizationIdForBaOrg } from './tenant'

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
  beforeAll(async () => {
    await runSeed()
  })

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

  it('has Better Auth and legacy organizations linked', async () => {
    const baOrg = await db.query.organization.findFirst({
      where: eq(baOrganization.slug, 'gerpain'),
    })
    const legacyOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, 'gerpain'),
    })

    expect(baOrg).toBeDefined()
    expect(legacyOrg).toBeDefined()

    const legacyId = await legacyOrganizationIdForBaOrg(baOrg!.id)
    expect(legacyId).toBe(legacyOrg?.id)
  })

  it('has bakery catalog seed data', async () => {
    const legacyOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, 'gerpain'),
    })
    expect(legacyOrg).toBeDefined()

    const catalog = await db.query.products.findMany({
      where: eq(products.organizationId, legacyOrg!.id),
    })
    expect(catalog.length).toBeGreaterThanOrEqual(9)
  })
})

if (!dbReady) {
  console.warn(
    `[db] Skipping integration tests — Postgres not reachable at ${DATABASE_URL}`,
  )
}
