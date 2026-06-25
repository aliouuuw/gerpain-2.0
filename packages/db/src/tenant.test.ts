import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db, closeDatabase } from './client'
import { organization as baOrganization, organizations } from './schema/index'
import { legacyOrganizationIdForBaOrg } from './tenant'
import { runSeed } from './scripts/seed-core'

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://gerpain:gerpain@localhost:5432/gerpain_dev'

async function isDatabaseReachable(): Promise<boolean> {
  const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 3 })
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

describe.skipIf(!dbReady)('tenant bridge', () => {
  beforeAll(async () => {
    await runSeed()
  })

  afterAll(async () => {
    await closeDatabase()
  })

  it('resolves legacy org UUID from Better Auth org id', async () => {
    const baOrg = await db.query.organization.findFirst({
      where: eq(baOrganization.slug, 'gerpain'),
    })
    const legacyOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, 'gerpain'),
    })

    expect(baOrg).toBeDefined()
    expect(legacyOrg).toBeDefined()

    const resolved = await legacyOrganizationIdForBaOrg(baOrg!.id)
    expect(resolved).toBe(legacyOrg!.id)
  })

  it('returns null for unknown Better Auth org id', async () => {
    const resolved = await legacyOrganizationIdForBaOrg('nonexistent-org-id')
    expect(resolved).toBeNull()
  })
})
