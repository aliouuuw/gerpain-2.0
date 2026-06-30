import { and, eq } from 'drizzle-orm'

import type { BocalTx } from '@gerpain/bocal'
import { type Database, ledgerAccounts } from '@gerpain/db'

export const LEDGER_ACCOUNT_CODES = {
  CASH: 'CASH',
  DRIVER_RECEIVABLE: 'DRIVER_RECEIVABLE',
  CASH_SHORTAGE: 'CASH_SHORTAGE',
  CASH_OVERAGE: 'CASH_OVERAGE',
  SALARY_ADVANCE_RECEIVABLE: 'SALARY_ADVANCE_RECEIVABLE',
  PAYROLL_CLEARING: 'PAYROLL_CLEARING',
} as const

export type LedgerAccountIds = {
  cash: string
  driverReceivable: string
  cashShortage: string
  cashOverage: string
  salaryAdvanceReceivable: string
  payrollClearing: string
}

export class LedgerAccountsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LedgerAccountsError'
  }
}

export async function getLedgerAccountMap(
  db: Database | BocalTx,
  organizationId: string,
): Promise<LedgerAccountIds> {
  await ensureLedgerAccountsForOrg(db as Database, organizationId)

  const rows = await db.query.ledgerAccounts.findMany({
    where: eq(ledgerAccounts.organizationId, organizationId),
  })

  const byCode = new Map(rows.map((row) => [row.code, row.id]))

  const cash = byCode.get(LEDGER_ACCOUNT_CODES.CASH)
  const driverReceivable = byCode.get(LEDGER_ACCOUNT_CODES.DRIVER_RECEIVABLE)
  const cashShortage = byCode.get(LEDGER_ACCOUNT_CODES.CASH_SHORTAGE)
  const cashOverage = byCode.get(LEDGER_ACCOUNT_CODES.CASH_OVERAGE)
  const salaryAdvanceReceivable = byCode.get(
    LEDGER_ACCOUNT_CODES.SALARY_ADVANCE_RECEIVABLE,
  )
  const payrollClearing = byCode.get(LEDGER_ACCOUNT_CODES.PAYROLL_CLEARING)

  if (
    !cash ||
    !driverReceivable ||
    !cashShortage ||
    !cashOverage ||
    !salaryAdvanceReceivable ||
    !payrollClearing
  ) {
    throw new LedgerAccountsError(
      'Comptes ledger manquants pour cette organisation',
    )
  }

  return {
    cash,
    driverReceivable,
    cashShortage,
    cashOverage,
    salaryAdvanceReceivable,
    payrollClearing,
  }
}

export async function ensureLedgerAccountsForOrg(
  db: Database,
  organizationId: string,
): Promise<void> {
  const defaults = [
    {
      code: LEDGER_ACCOUNT_CODES.CASH,
      name: 'Caisse',
      type: 'asset' as const,
    },
    {
      code: LEDGER_ACCOUNT_CODES.DRIVER_RECEIVABLE,
      name: 'Créances livreurs',
      type: 'asset' as const,
    },
    {
      code: LEDGER_ACCOUNT_CODES.CASH_SHORTAGE,
      name: 'Écarts caisse (manque)',
      type: 'expense' as const,
    },
    {
      code: LEDGER_ACCOUNT_CODES.CASH_OVERAGE,
      name: 'Écarts caisse (excédent)',
      type: 'revenue' as const,
    },
    {
      code: LEDGER_ACCOUNT_CODES.SALARY_ADVANCE_RECEIVABLE,
      name: 'Avances sur salaire',
      type: 'asset' as const,
    },
    {
      code: LEDGER_ACCOUNT_CODES.PAYROLL_CLEARING,
      name: 'Paie en attente de clôture',
      type: 'liability' as const,
    },
  ]

  for (const account of defaults) {
    const existing = await db.query.ledgerAccounts.findFirst({
      where: and(
        eq(ledgerAccounts.organizationId, organizationId),
        eq(ledgerAccounts.code, account.code),
      ),
    })
    if (!existing) {
      await db.insert(ledgerAccounts).values({
        organizationId,
        ...account,
      })
    }
  }
}
