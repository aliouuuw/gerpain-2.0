# Gerpain 2.0 — Target Architecture

Status: target state. We are migrating from a split Hono+Bun / Next.js app to a
single typed full-stack app. Rationale in `adr/0001-unified-base-stack.md`.

## Why unified

The split stack costs us end-to-end type safety (hand-written API clients in
`nextjs_frontend/lib/api/*`), two deploys, CORS/header juggling
(`X-Organization-ID`, `X-Bakery-ID`), and duplicated validation. A single app
with a typed RPC boundary removes all of that and makes the pattern repeatable
across future projects (EduPlan next).

## Monorepo layout

```
gerpain-2.0/
├── apps/
│   └── gerpain/                  # single TanStack Start app
│       ├── src/routes/           # pages + nested layouts
│       ├── src/server/           # oRPC routers (thin procedures)
│       │   ├── collections.ts
│       │   ├── deliveries.ts
│       │   └── employees.ts
│       ├── src/services/         # business logic (deep modules)
│       └── src/lib/              # query client, auth client
├── packages/
│   ├── bocal/                    # ledger: Drizzle-only, framework-free
│   ├── db/                       # Drizzle schema + client (shared)
│   └── auth/                     # Better Auth config (shared)
├── pnpm-workspace.yaml
├── AGENTS.md
└── docs/
```

### Package boundaries

- **`packages/db`** owns the Drizzle schema (split: `auth.ts`, `org.ts`,
  `operations.ts`, `ledger.ts`) and the db client. Single source of schema for
  both the app and Bocal.
- **`packages/bocal`** is the ledger primitive. Drizzle + Zod + a passed `tx`
  only. No framework, no auth, no app imports. See `bocal-spec.md`.
- **`packages/auth`** wraps Better Auth (sessions, org/multi-tenant).
- **`apps/gerpain`** is the only deployable. Procedures are thin; services hold
  logic and call Bocal inside transactions.

## Request flow

```
route (page)  →  TanStack Query  →  oRPC client
   →  oRPC procedure (authz + validate)  →  service
      →  db.transaction(tx => { workflow write + bocal.post(tx, …) })
```

Money KPIs read **derived ledger balances** from Bocal, never workflow tables.

## Migration sequence (re-plumb)

Most of the current project survives; this is a re-housing, not a rewrite.

| Asset | Fate |
|---|---|
| Drizzle schema | **Survives** → move to `packages/db`, split by domain |
| Business logic (collection state machine, delivery→collection, settlement, commissions) | **Survives** → move into `src/services/` |
| TanStack Query hooks (`useCollections`, `useDeliveries`, …) | **Mostly survive** → repoint from REST `apiClient` to oRPC client |
| UI components / pages | **Survive** → reusable as-is |
| Hono routes | **Replaced** by thin oRPC procedures |
| Lucia auth | **Replaced** by Better Auth |
| Hand-written `lib/api/*` types | **Deleted** → oRPC infers them |
| Redis | **Optional**, cache-only; add back if needed |

Steps:

1. Scaffold TanStack Start app + `pnpm-workspace.yaml`.
2. Move schema → `packages/db`. Stand up `packages/bocal` **tests-first**.
3. Wire Better Auth + org context (`packages/auth`).
4. Port domains as **vertical slices**, one at a time:
   `deliveries → collections (+ Bocal on validate) → settlement → commissions`.
   Each slice = service + oRPC procedure + repointed hook + page.
5. Delete the old Hono app once parity is reached.

## EduPlan reuse

EduPlan starts as a clone of this base: same TanStack Start + oRPC + Drizzle +
Neon + Better Auth skeleton, with `packages/bocal` dropped in unchanged to model
school fees / payments / waivers as ledger movements. Second domain validates
both the ledger primitive and the repeatable base.
