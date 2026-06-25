# ADR 0002 — Bocal: append-only ledger primitive

- Status: Accepted
- Date: 2026-06-25
- Related: ADR 0001, `docs/bocal-spec.md`

## Decision

Introduce **`packages/bocal`**, a framework-free, Drizzle-only module that owns
financial truth as **append-only, balanced movements** with **derived
balances** and a complete audit trail. All money in Gerpain flows through it.

## Context

Money in the current app lives in mutable workflow tables (e.g.
`cash_collections` with status flips and an in-place `variance`). This is fine
for operator workflow but wrong as a system of financial record: in-place
updates destroy history, make reconciliation fragile, and scatter "how much is
owed / collected / settled" across ad-hoc queries.

We want one durable, auditable primitive that:

- never mutates a committed financial fact,
- represents corrections as new balanced movements,
- derives balances rather than storing mutable totals,
- is portable to other domains (EduPlan school fees) unchanged.

## Decision details

- **Append-only.** Posted movements are immutable. Reversals/corrections are new
  movements that reference the original.
- **Balanced.** Each posting balances (double-entry style) so totals always
  reconcile.
- **Derived balances.** Balances are computed/projected from movements, never
  written directly.
- **Dual-layer with workflow tables.** Operators keep interacting with
  `cash_collections` (mutable status). On *validate*, the workflow write and the
  Bocal posting commit **atomically in one `db.transaction()`**. Money KPIs read
  from Bocal balances.
- **Portability.** Bocal imports only Drizzle, Zod, and a passed `tx`. No
  framework, no auth, no app code. (Enforced as a hard rule in `AGENTS.md`.)

## Consequences

- Full, immutable financial history and trustworthy reconciliation.
- Slightly more ceremony than direct updates; corrections require a movement.
- Validates the long-term thesis: a reusable operational substrate (see
  `myportfolio/docs/bocal-direction.md`). EduPlan reuses Bocal as-is.
- Inventory may later adopt the same balanced-movement primitive.
