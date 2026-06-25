import { and, asc, eq, exists, gt, inArray } from 'drizzle-orm'

import { ledgerLines, ledgerMovements } from '@gerpain/db/schema'

import type { BocalTx, MovementWithLines, MovementsForInput, Page } from './types'

export async function movementsFor(
  tx: BocalTx,
  input: MovementsForInput,
): Promise<Page<MovementWithLines>> {
  const { limit, cursor } = input.paginationOpts
  const safeLimit = Math.min(Math.max(limit, 1), 100)

  const filters = [eq(ledgerMovements.organizationId, input.organizationId)]

  if (input.sourceType) {
    filters.push(eq(ledgerMovements.sourceType, input.sourceType))
  }

  if (input.sourceId) {
    filters.push(eq(ledgerMovements.sourceId, input.sourceId))
  }

  if (input.accountId) {
    filters.push(
      exists(
        tx
          .select({ id: ledgerLines.id })
          .from(ledgerLines)
          .where(
            and(
              eq(ledgerLines.movementId, ledgerMovements.id),
              eq(ledgerLines.accountId, input.accountId),
            ),
          ),
      ),
    )
  }

  if (cursor) {
    filters.push(gt(ledgerMovements.id, cursor))
  }

  const movements = await tx
    .select()
    .from(ledgerMovements)
    .where(and(...filters))
    .orderBy(asc(ledgerMovements.id))
    .limit(safeLimit + 1)

  const pageMovements = movements.slice(0, safeLimit)
  const movementIds = pageMovements.map((movement) => movement.id)

  const lines =
    movementIds.length === 0
      ? []
      : await tx
          .select()
          .from(ledgerLines)
          .where(inArray(ledgerLines.movementId, movementIds))

  const linesByMovement = new Map<string, MovementWithLines['lines']>()
  for (const line of lines) {
    const existing = linesByMovement.get(line.movementId) ?? []
    existing.push({
      id: line.id,
      accountId: line.accountId,
      direction: line.direction,
      amount: line.amount,
      currency: line.currency,
    })
    linesByMovement.set(line.movementId, existing)
  }

  const items: MovementWithLines[] = pageMovements.map((movement) => ({
    ...movement,
    lines: linesByMovement.get(movement.id) ?? [],
  }))

  const hasMore = movements.length > safeLimit
  const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null

  return {
    items,
    nextCursor,
    isDone: !hasMore,
  }
}
