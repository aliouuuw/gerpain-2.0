import { describe, expect, it } from 'vitest'

import { ledgerMovements } from '@gerpain/db/schema'

import { balanceOf } from './balance.ts'
import { UnbalancedPostingError } from './errors.ts'
import { post } from './post.ts'
import { reverse } from './reverse.ts'
import { createAccount, createTestDb, seedOrganization } from './test/helpers.ts'

describe('bocal post', () => {
  it('throws when lines are unbalanced', async () => {
    const db = await createTestDb()
    const { organization } = await seedOrganization(db)
    const cash = await createAccount(db, organization.id, 'cash')
    const receivable = await createAccount(db, organization.id, 'receivable')

    await expect(
      db.transaction((tx) =>
        post(tx, {
          organizationId: organization.id,
          occurredAt: new Date('2026-01-15T10:00:00Z'),
          sourceType: 'cash_collection',
          sourceId: 'collection-1',
          lines: [
            {
              accountId: cash.id,
              direction: 'debit',
              amount: 10_000,
              currency: 'XOF',
            },
            {
              accountId: receivable.id,
              direction: 'credit',
              amount: 9_000,
              currency: 'XOF',
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(UnbalancedPostingError)
  })

  it('appends a balanced movement', async () => {
    const db = await createTestDb()
    const { organization } = await seedOrganization(db)
    const cash = await createAccount(db, organization.id, 'cash')
    const receivable = await createAccount(db, organization.id, 'receivable')

    const movementId = await db.transaction((tx) =>
      post(tx, {
        organizationId: organization.id,
        occurredAt: new Date('2026-01-15T10:00:00Z'),
        sourceType: 'cash_collection',
        sourceId: 'collection-1',
        memo: 'Cash collection validated',
        lines: [
          {
            accountId: cash.id,
            direction: 'debit',
            amount: 10_000,
            currency: 'XOF',
          },
          {
            accountId: receivable.id,
            direction: 'credit',
            amount: 10_000,
            currency: 'XOF',
          },
        ],
      }),
    )

    const movements = await db.select().from(ledgerMovements)
    expect(movements).toHaveLength(1)
    expect(movements[0]?.id).toBe(movementId)
  })
})

describe('bocal reverse', () => {
  it('inverts lines and leaves the original movement intact', async () => {
    const db = await createTestDb()
    const { organization } = await seedOrganization(db)
    const cash = await createAccount(db, organization.id, 'cash')
    const receivable = await createAccount(db, organization.id, 'receivable')

    const originalId = await db.transaction((tx) =>
      post(tx, {
        organizationId: organization.id,
        occurredAt: new Date('2026-01-15T10:00:00Z'),
        sourceType: 'cash_collection',
        sourceId: 'collection-1',
        lines: [
          {
            accountId: cash.id,
            direction: 'debit',
            amount: 10_000,
            currency: 'XOF',
          },
          {
            accountId: receivable.id,
            direction: 'credit',
            amount: 10_000,
            currency: 'XOF',
          },
        ],
      }),
    )

    const reversalId = await db.transaction((tx) =>
      reverse(tx, { movementId: originalId, memo: 'Correction' }),
    )

    const movements = await db
      .select()
      .from(ledgerMovements)
      .orderBy(ledgerMovements.createdAt)

    expect(movements).toHaveLength(2)
    expect(movements[0]?.id).toBe(originalId)
    expect(movements[1]?.id).toBe(reversalId)
    expect(movements[1]?.reversesMovementId).toBe(originalId)

    const cashBalance = await db.transaction((tx) =>
      balanceOf(tx, {
        organizationId: organization.id,
        accountId: cash.id,
      }),
    )
    expect(cashBalance).toBe(0n)
  })
})

describe('bocal balanceOf', () => {
  it('isolates balances by organization', async () => {
    const db = await createTestDb()
    const orgA = await seedOrganization(db)
    const orgB = await seedOrganization(db)

    const cashA = await createAccount(db, orgA.organization.id, 'cash-a')
    const cashB = await createAccount(db, orgB.organization.id, 'cash-b')
    const receivableA = await createAccount(db, orgA.organization.id, 'recv-a')
    const receivableB = await createAccount(db, orgB.organization.id, 'recv-b')

    await db.transaction((tx) =>
      post(tx, {
        organizationId: orgA.organization.id,
        occurredAt: new Date('2026-01-15T10:00:00Z'),
        sourceType: 'cash_collection',
        sourceId: 'a-1',
        lines: [
          {
            accountId: cashA.id,
            direction: 'debit',
            amount: 5_000,
            currency: 'XOF',
          },
          {
            accountId: receivableA.id,
            direction: 'credit',
            amount: 5_000,
            currency: 'XOF',
          },
        ],
      }),
    )

    await db.transaction((tx) =>
      post(tx, {
        organizationId: orgB.organization.id,
        occurredAt: new Date('2026-01-15T11:00:00Z'),
        sourceType: 'cash_collection',
        sourceId: 'b-1',
        lines: [
          {
            accountId: cashB.id,
            direction: 'debit',
            amount: 8_000,
            currency: 'XOF',
          },
          {
            accountId: receivableB.id,
            direction: 'credit',
            amount: 8_000,
            currency: 'XOF',
          },
        ],
      }),
    )

    const balanceA = await db.transaction((tx) =>
      balanceOf(tx, {
        organizationId: orgA.organization.id,
        accountId: cashA.id,
      }),
    )
    const balanceB = await db.transaction((tx) =>
      balanceOf(tx, {
        organizationId: orgB.organization.id,
        accountId: cashB.id,
      }),
    )

    expect(balanceA).toBe(5_000n)
    expect(balanceB).toBe(8_000n)

    const crossTenantBalance = await db.transaction((tx) =>
      balanceOf(tx, {
        organizationId: orgA.organization.id,
        accountId: cashB.id,
      }),
    )
    expect(crossTenantBalance).toBe(0n)
  })
})
