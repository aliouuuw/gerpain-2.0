import { ledgerLines, ledgerMovements } from '@gerpain/db/schema'

import { assertAccountsInOrganization, assertBalanced } from './validate'
import type { BocalTx, MovementId, PostInput } from './types'

export async function post(tx: BocalTx, input: PostInput): Promise<MovementId> {
  if (input.lines.length < 2) {
    throw new Error('Posting requires at least two lines')
  }

  assertBalanced(input.lines)
  await assertAccountsInOrganization(
    tx,
    input.organizationId,
    input.lines.map((line) => line.accountId),
  )

  const [movement] = await tx
    .insert(ledgerMovements)
    .values({
      organizationId: input.organizationId,
      occurredAt: input.occurredAt,
      memo: input.memo,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      createdBy: input.createdBy,
      reversesMovementId: input.reversesMovementId,
    })
    .returning({ id: ledgerMovements.id })

  if (!movement) {
    throw new Error('Failed to create ledger movement')
  }

  await tx.insert(ledgerLines).values(
    input.lines.map((line) => ({
      movementId: movement.id,
      accountId: line.accountId,
      direction: line.direction,
      amount: line.amount,
      currency: line.currency,
    })),
  )

  return movement.id
}
