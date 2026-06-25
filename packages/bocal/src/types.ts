import type { ExtractTablesWithRelations } from 'drizzle-orm'
import type { PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core'
import type {
  LedgerLineDirection,
  LedgerMovement,
} from '@gerpain/db/schema'
import type * as schema from '@gerpain/db/schema'

export type BocalSchema = typeof schema

export type BocalTx = PgTransaction<
  PgQueryResultHKT,
  BocalSchema,
  ExtractTablesWithRelations<BocalSchema>
>

export type MovementId = string

export interface PostLine {
  accountId: string
  direction: LedgerLineDirection
  amount: number
  currency: string
}

export interface PostInput {
  organizationId: string
  occurredAt: Date
  memo?: string
  sourceType: string
  sourceId: string
  lines: PostLine[]
  createdBy?: string
  reversesMovementId?: string
}

export interface ReverseInput {
  movementId: MovementId
  memo?: string
  createdBy?: string
}

export interface BalanceOfInput {
  organizationId: string
  accountId: string
  asOf?: Date
}

export interface BalancesForInput {
  organizationId: string
  accountIds: string[]
  asOf?: Date
}

export interface PaginationOpts {
  limit: number
  cursor?: string | null
}

export interface MovementsForInput {
  organizationId: string
  sourceType?: string
  sourceId?: string
  accountId?: string
  paginationOpts: PaginationOpts
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
  isDone: boolean
}

export type MovementWithLines = LedgerMovement & {
  lines: Array<{
    id: string
    accountId: string
    direction: LedgerLineDirection
    amount: number
    currency: string
  }>
}
