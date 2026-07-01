# ADR 0004 — Payroll close through Bocal

- Status: Accepted
- Date: 2026-06-30
- Related: ADR 0003, `docs/bocal-spec.md`

## Decision

Payroll close (clôture de paie) uses workflow tables for operator audit and
**Bocal postings** for cash payout. Advance repayments via payroll deduction
and net salary payment commit **atomically in one `db.transaction()`**.

## Context

Operators need to close a payroll period with a per-employee bulletin:
base salary + product commissions (validated deliveries) − advance
installments due. Until close, commission is preview-only; close is the
immutable record.

## Workflow tables

- **`payroll_runs`** — period header: bakery, date range, period label
  (`YYYY-MM` from end date), status (`closed`), totals, closed timestamp.
- **`payroll_run_lines`** — per employee: base, commission, bonus, advance
  deduction, collection shortfall deduction, gross, net; `detail_snapshot`
  json for commission/cash audit.

One closed run per bakery + `startDate` + `endDate`.

## Net pay formula (v2)

```
gross               = baseSalary + commissionDue + bonusDue
collectionShortfall = max(expectedCollected − actualCollected, 0)  // manque caisse only
net                 = max(gross − advanceInstallmentsDue − collectionShortfall, 0)
```

Advance installments due: status `scheduled` and `duePeriod` matches the
payroll period label, or next scheduled installment when `duePeriod` is null.

**Collection shortfall** uses the same period encaissement totals as the
agent activity view (non-archived collections in range). Only a **manque**
reduces net pay; a surplus (excédent) is shown for information and does not
increase net.

Bonuses due for the payroll `periodLabel` (`scheduled` status) add to gross.

On close, validated encaissements in the period are marked `isSettled`.

## Ledger accounts

| Code | Type | Role |
|------|------|------|
| `SALARY_EXPENSE` | expense | Net salary paid out |
| `CASH` | asset | Cash leaving the bakery |
| `PAYROLL_CLEARING` | liability | Advance repayments via payroll (ADR 0003) |

## Postings on close

For each due advance installment (existing ADR 0003 flow):

```
Dr PAYROLL_CLEARING           installmentAmount
Cr SALARY_ADVANCE_RECEIVABLE  installmentAmount
```

Aggregated net payout (`sourceType: payroll_run`):

```
Dr SALARY_EXPENSE  totalNetPaid
Cr CASH            totalNetPaid
```

## Consequences

- Rémunération and Réconciliations show commission preview; Paie is the
  authoritative close.
- Re-opening a closed period is not supported in v1; corrections are new
  movements or a future reversal ADR.
- CSV/PDF export can read from `payroll_run_lines` without recomputing.
