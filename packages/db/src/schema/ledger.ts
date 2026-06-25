import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

import { users } from './auth'
import { organizations } from './org'

export const ledgerAccountTypes = [
  'asset',
  'liability',
  'revenue',
  'expense',
  'equity',
] as const

export type LedgerAccountType = (typeof ledgerAccountTypes)[number]

export const ledgerLineDirections = ['debit', 'credit'] as const

export type LedgerLineDirection = (typeof ledgerLineDirections)[number]

export const ledgerAccounts = pgTable(
  'ledger_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull().$type<LedgerAccountType>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ledger_accounts_org_code_idx').on(table.organizationId, table.code),
  ],
)

export const ledgerMovements = pgTable('ledger_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  occurredAt: timestamp('occurred_at').notNull(),
  memo: text('memo'),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  reversesMovementId: uuid('reverses_movement_id').references(
    (): AnyPgColumn => ledgerMovements.id,
  ),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const ledgerLines = pgTable('ledger_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  movementId: uuid('movement_id')
    .notNull()
    .references(() => ledgerMovements.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => ledgerAccounts.id, { onDelete: 'restrict' }),
  direction: text('direction').notNull().$type<LedgerLineDirection>(),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('XOF'),
})

export const ledgerAccountsRelations = relations(ledgerAccounts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [ledgerAccounts.organizationId],
    references: [organizations.id],
  }),
  lines: many(ledgerLines),
}))

export const ledgerMovementsRelations = relations(ledgerMovements, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [ledgerMovements.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [ledgerMovements.createdBy],
    references: [users.id],
  }),
  reversesMovement: one(ledgerMovements, {
    fields: [ledgerMovements.reversesMovementId],
    references: [ledgerMovements.id],
    relationName: 'movement_reversal',
  }),
  lines: many(ledgerLines),
}))

export const ledgerLinesRelations = relations(ledgerLines, ({ one }) => ({
  movement: one(ledgerMovements, {
    fields: [ledgerLines.movementId],
    references: [ledgerMovements.id],
  }),
  account: one(ledgerAccounts, {
    fields: [ledgerLines.accountId],
    references: [ledgerAccounts.id],
  }),
}))

export type LedgerAccount = typeof ledgerAccounts.$inferSelect
export type NewLedgerAccount = typeof ledgerAccounts.$inferInsert
export type LedgerMovement = typeof ledgerMovements.$inferSelect
export type NewLedgerMovement = typeof ledgerMovements.$inferInsert
export type LedgerLine = typeof ledgerLines.$inferSelect
export type NewLedgerLine = typeof ledgerLines.$inferInsert
