# AGENTS.md — Gerpain 2.0 AI Conventions

Operational software for bakery distribution (deliveries, cash collections,
settlement, commissions, inventory). Multi-tenant, bilingual operator UI (FR
primary). Solo-maintained, AI-agentic workflow.

This file is the source of truth for how agents work in this repo. Read it
before editing. For *why* decisions were made, see `docs/adr/`.

## Target stack (the base we are re-plumbing toward)

| Concern | Choice |
|---|---|
| App framework | **TanStack Start** (single full-stack app, SSR + SPA) |
| RPC / API | **oRPC** — end-to-end typed procedures, no hand-written clients |
| Data fetching | **TanStack Query** |
| ORM / DB | **Drizzle + Neon Postgres** |
| Auth | **Better Auth** (sessions + org/multi-tenant) |
| Ledger | **`packages/bocal`** — append-only financial movements |
| Tests | **Vitest** |
| Monorepo | **Bun workspaces** |

The current repo is a **split** Hono+Bun backend (`gerpain_backend/`) + Next.js
frontend (`nextjs_frontend/`) with Lucia auth. We are migrating to the unified
base above. See `docs/architecture.md` for the layout and migration sequence,
and ADR 0001 for the rationale.

## Hard rules (do not violate without an explicit task + ADR)

1. **All money mutations go through Bocal.** Never `UPDATE` a validated
   financial record in place. Corrections are new, balanced, append-only
   movements. Direct writes to ledger balances are forbidden — balances are
   *derived*.
2. **`packages/bocal` is Drizzle-only.** It imports Drizzle, Zod, and a passed
   transaction (`tx`). It must **never** import the app framework, oRPC, auth,
   or anything app-specific. This is what makes it port to EduPlan unchanged.
3. **oRPC procedures are thin.** A procedure does three things: authorize,
   validate input, call a service. Business logic lives in `src/services/`,
   not in procedures.
4. **Schema lives in `packages/db`.** Both the app and Bocal import schema from
   there. Split by domain (`auth.ts`, `org.ts`, `operations.ts`, `ledger.ts`).
5. **Multi-tenant scoping is mandatory.** Every query that touches tenant data
   filters by the active `organizationId` (and `bakeryId` where relevant).
   Never trust a client-supplied tenant id without an auth check.
6. **No `any`.** Use Drizzle/Zod-inferred types and `Id`-style typed ids.
7. **Operator UI in French first.** User-facing copy is FR; keep EN strings
   where infrastructure already supports it.

## Dual-layer money model

Operators interact with **workflow tables** (e.g. `cash_collections`) that have
mutable status (`pending → submitted → validated/rejected`). Financial **truth**
lives in the **Bocal ledger**. When a collection is *validated*, the workflow
mutation and the Bocal posting commit **atomically in one `db.transaction()`**.
KPIs about money read from **derived ledger balances**, not workflow rows.

## Verification

After changes, the build and tests must be green:

```bash
bun install
bun run build
bun run test        # Bocal has unit tests; run them on any ledger change
bun run typecheck
```

## What NOT to do

| Rule | Reason |
|---|---|
| Don't put business logic in oRPC procedures | Procedures stay thin; logic is testable in services |
| Don't let Bocal import framework/auth code | Keeps the ledger portable across projects |
| Don't mutate validated financial rows | Audit integrity; corrections are append-only |
| Don't read money KPIs from workflow tables | Ledger balances are the source of truth |
| Don't reintroduce Lucia | Deprecated; Better Auth is the target |
| Don't hand-write API response types | oRPC infers them end-to-end |
| Don't skip tenant scoping on queries | Cross-tenant data leak risk |
