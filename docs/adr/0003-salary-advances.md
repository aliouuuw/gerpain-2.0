# ADR 0003 — Salary advances through Bocal

- Status: Accepted
- Date: 2026-06-30
- Related: ADR 0002, `docs/bocal-spec.md`

## Decision

Salary advances (avances sur salaire) use the **dual-layer** pattern from ADR
0002: mutable workflow tables for operator state, **Bocal postings** for money
truth. Granting an advance and recording each repayment commit workflow writes
and ledger movements **atomically in one `db.transaction()`**.

## Context

Operators need to track cash paid to employees before payroll close, with
installment schedules and per-period choices (deduct installment, pay full
remainder, or roll over). Payroll close (future ADR) will net advances against
salary; until then, repayments are recorded explicitly.

## Workflow tables

- **`salary_advances`** — grant header: employee, total amount, installment
  count, status (`active` | `closed` | `cancelled`), notes, granted date.
- **`salary_advance_installments`** — schedule rows: installment number,
  amount, optional due period (`YYYY-MM`), status (`scheduled` | `paid` |
  `rolled_over` | `skipped`), payment method when paid.

Remaining balance is **derived** from installments with status `scheduled` or
`rolled_over` (amounts rolled forward are merged into the next scheduled row).

## Ledger accounts (per organization)

| Code | Type | Role |
|------|------|------|
| `SALARY_ADVANCE_RECEIVABLE` | asset | Amount owed back by employees |
| `PAYROLL_CLEARING` | liability | Payroll deductions pending period close |

Existing `CASH` is used when cash leaves or returns.

## Postings

**Grant** (`sourceType: salary_advance`, `sourceId: <advanceId>`):

```
Dr SALARY_ADVANCE_RECEIVABLE  totalAmount
Cr CASH                       totalAmount
```

**Repayment — payroll deduction** (`sourceType: salary_advance_installment`):

```
Dr PAYROLL_CLEARING           installmentAmount
Cr SALARY_ADVANCE_RECEIVABLE  installmentAmount
```

**Repayment — cash returned**:

```
Dr CASH                       installmentAmount
Cr SALARY_ADVANCE_RECEIVABLE  installmentAmount
```

**Cancel** (no paid installments): `reverse()` the grant movement; advance
status → `cancelled`.

Corrections use new movements (reversal), never in-place ledger edits.

## Consequences

- Advance KPIs and reconciliation read from Bocal balances + workflow status.
- Payroll close can aggregate `PAYROLL_CLEARING` debits per employee.
- Per-employee sub-accounts are not required in v0; traceability is via
  `sourceId` on movements tied to advance/installment ids.
