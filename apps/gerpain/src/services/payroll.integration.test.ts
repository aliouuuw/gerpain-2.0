import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db, closeDatabase } from '@gerpain/db'
import { bakeries, employees, organizations } from '@gerpain/db/schema'

import {
  closePayroll,
  previewPayroll,
} from '#/services/payroll'
import { createSalaryBonus } from '#/services/salary-bonuses'

async function isDatabaseReachable(): Promise<boolean> {
  try {
    await db.query.organizations.findFirst()
    return true
  } catch {
    return false
  }
}

async function hasSeedData(): Promise<boolean> {
  const legacyOrg = await db.query.organizations.findFirst({
    where: eq(organizations.slug, 'gerpain'),
  })
  return Boolean(legacyOrg)
}

const dbReady = await isDatabaseReachable()
const seeded = dbReady ? await hasSeedData() : false

describe.skipIf(!dbReady || !seeded)('payroll close integration', () => {
  let organizationId = ''
  let bakeryId = ''

  beforeAll(async () => {
    const legacyOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, 'gerpain'),
    })
    organizationId = legacyOrg!.id

    const bakery = await db.query.bakeries.findFirst({
      where: eq(bakeries.organizationId, organizationId),
    })
    bakeryId = bakery!.id
  })

  afterAll(async () => {
    await closeDatabase()
  })

  it('previews and closes an isolated payroll period with bonus', async () => {
    const startDate = '2099-03-01'
    const endDate = '2099-03-15'

    const staff = await db.query.employees.findMany({
      where: eq(employees.bakeryId, bakeryId),
      limit: 1,
    })
    expect(staff.length).toBeGreaterThan(0)

    await createSalaryBonus(db, organizationId, bakeryId, {
      employeeId: staff[0]!.id,
      amount: 1_000,
      duePeriod: '2099-03',
      reason: 'Test prime',
    })

    const preview = await previewPayroll(db, {
      organizationId,
      bakeryId,
      startDate,
      endDate,
    })

    expect(preview.isClosed).toBe(false)
    expect(preview.lines.length).toBeGreaterThan(0)

    const bonusLine = preview.lines.find(
      (line) => line.employeeId === staff[0]!.id,
    )
    expect(bonusLine?.bonusAmount).toBe(1_000)

    const closed = await closePayroll(db, {
      organizationId,
      bakeryId,
      startDate,
      endDate,
    })

    expect(closed.status).toBe('closed')
    expect(closed.totalNet).toBe(preview.totals.net)

    const frozen = await previewPayroll(db, {
      organizationId,
      bakeryId,
      startDate,
      endDate,
    })
    expect(frozen.isClosed).toBe(true)
    expect(frozen.lines.find((line) => line.employeeId === staff[0]!.id)?.bonusAmount).toBe(
      1_000,
    )
  })
})
