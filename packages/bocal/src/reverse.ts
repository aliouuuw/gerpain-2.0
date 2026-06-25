import { eq } from 'drizzle-orm'

import { ledgerLines, ledgerMovements } from '@gerpain/db/schema'

import { MovementNotFoundError } from './errors'
import { post } from './post'
import type { BocalTx, MovementId, ReverseInput } from './types'

export async function reverse(
  tx: BocalTx,
  input: ReverseInput,
): Promise<MovementId> {
  const [movement] = await tx
    .select()
    .from(ledgerMovements)
    .where(eq(ledgerMovements.id, input.movementId))
    .limit(1)

  if (!movement) {
    throw new MovementNotFoundError(input.movementId)
  }

  const lines = await tx
    .select()
    .from(ledgerLines)
    .where(eq(ledgerLines.movementId, movement.id))

  return post(tx, {
    organizationId: movement.organizationId,
    occurredAt: new Date(),
    memo: input.memo ?? `Reversal of movement ${movement.id}`,
    sourceType: movement.sourceType,
    sourceId: movement.sourceId,
    createdBy: input.createdBy,
    reversesMovementId: movement.id,
    lines: lines.map((line) => ({
      accountId: line.accountId,
      direction: line.direction === 'debit' ? 'credit' : 'debit',
      amount: line.amount,
      currency: line.currency,
    })),
  })
}
