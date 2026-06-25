# Bocal v0 — Specification

`packages/bocal`: an append-only, balanced-movement ledger. Drizzle-only,
framework-free, portable. Decision context in `adr/0002-bocal-ledger.md`.

## Principles

1. **Append-only** — committed movements are immutable.
2. **Balanced** — every posting's lines sum to zero (double-entry).
3. **Derived balances** — balances are projected from lines, never stored as
   mutable totals.
4. **Transactional** — every write takes a caller-supplied `tx`; the ledger
   posting and the caller's workflow write commit together or not at all.
5. **Tenant-scoped** — every account and movement carries `organizationId`.
6. **Auditable** — who/when/why and source reference are recorded per movement.

## Data model (target, in `packages/db/ledger.ts`)

```
ledger_accounts
  id, organizationId, code, name, type            -- type: asset|liability|revenue|expense|equity
  (unique: organizationId + code)

ledger_movements                                  -- the immutable "transaction"
  id, organizationId, occurredAt, memo
  sourceType, sourceId                             -- e.g. "cash_collection", <collectionId>
  reversesMovementId (nullable)                    -- correction link
  createdBy, createdAt

ledger_lines                                       -- balanced child rows
  id, movementId, accountId, direction             -- direction: debit|credit
  amount (integer, minor units), currency
  -- invariant: sum(debits) == sum(credits) per movement
```

Balances are computed:
`balance(account) = Σ debits − Σ credits` (sign by account type), or via a
projection/materialized view for hot paths.

## API surface (v0)

```ts
// All functions take a Drizzle transaction `tx` as the first argument.

post(tx, {
  organizationId,
  occurredAt,
  memo,
  sourceType,
  sourceId,
  lines: Array<{ accountId; direction: "debit" | "credit"; amount; currency }>,
  createdBy,
}): Promise<MovementId>
// Validates balance (Σdebit === Σcredit) and appends. Throws if unbalanced.

reverse(tx, {
  movementId,
  memo,
  createdBy,
}): Promise<MovementId>
// Appends a new movement with inverted lines, linked via reversesMovementId.
// Never mutates the original.

balanceOf(tx, { organizationId, accountId, asOf? }): Promise<bigint>

balancesFor(tx, { organizationId, accountIds, asOf? }): Promise<Record<Id, bigint>>

movementsFor(tx, {
  organizationId,
  sourceType?, sourceId?, accountId?,
  paginationOpts,
}): Promise<Page<Movement>>
```

Rules: no `update`/`delete` on movements or lines is exported. Money values are
integers in minor units. `currency` is explicit per line.

## Gerpain integration (collections slice)

On collection **validate**, inside one `db.transaction()`:

```ts
await db.transaction(async (tx) => {
  await collectionsService.markValidated(tx, collectionId, ...);
  await bocal.post(tx, {
    organizationId,
    occurredAt: now,
    sourceType: "cash_collection",
    sourceId: collectionId,
    memo: "Cash collection validated",
    lines: [
      { accountId: cashAccount,        direction: "debit",  amount, currency },
      { accountId: driverReceivable,   direction: "credit", amount, currency },
    ],
    createdBy: userId,
  });
});
```

Variance/short-payments become explicit balanced lines (e.g. an expense/write-off
account), not an in-place `variance` column. Dashboard money KPIs read
`balanceOf` / `balancesFor`, not workflow rows.

## Out of scope for v0

Multi-currency conversion, scheduled/recurring postings, period close/locking,
and inventory movements. Revisit once the collections slice is live.

## Tests (write first)

- A posting must balance or `post` throws.
- `reverse` produces inverted lines and leaves the original intact.
- `balanceOf` equals the sum of movements; reversal nets to zero.
- Tenant isolation: balances never cross `organizationId`.
