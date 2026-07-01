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
- **`payroll_run_lines`** — per employee: base, commission, advance
  deduction, gross, net.

One closed run per bakery + `startDate` + `endDate`.

## Net pay formula (v1)

```
gross = baseSalary + commissionDue (validated runs, per-product rates)
net   = max(gross − advanceInstallmentsDue, 0)
```

Advance installments due: status `scheduled` and `duePeriod` matches the
payroll period label, or next scheduled installment when `duePeriod` is null.

Bonuses and collection-remainder deductions are deferred.

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
