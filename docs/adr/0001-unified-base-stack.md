# ADR 0001 — Unified typed full-stack base

- Status: Accepted
- Date: 2026-06-25
- Context: Gerpain 2.0 re-plumb; base must also serve EduPlan and future projects.

## Decision

Build Gerpain 2.0 as a **single full-stack app** on:

```
TanStack Start + oRPC + Drizzle + Neon Postgres
Better Auth + TanStack Query + packages/bocal + Vitest
Bun workspaces monorepo
```

## Context

The current architecture is split: a Hono+Bun API (`gerpain_backend/`) and a
Next.js frontend (`nextjs_frontend/`) communicating over REST with
hand-written client types and custom tenant headers. This costs:

- No end-to-end type safety (API types duplicated in `lib/api/*`).
- Two deploys, CORS, and `X-Organization-ID` / `X-Bakery-ID` header juggling.
- Duplicated validation across boundary.
- Deprecated Lucia auth.

The owner is solo and works AI-agentically; repeatability and a clean typed
boundary matter more than ecosystem size.

## Options considered

1. **Keep split, add typed client (Hono RPC) + Better Auth.** ~80% of the
   benefit, less churn. Rejected: still two deploys and two apps to keep in
   sync; doesn't give the repeatable single-app base we want for EduPlan.
2. **Unified Next.js App Router + oRPC/Server Actions.** Strong: best agent
   training data, smoothest Vercel deploy, largest ecosystem. The conservative,
   defensible pick.
3. **Unified TanStack Start + oRPC.** Chosen.

## Why TanStack Start over Next.js

- Gerpain's frontend is already **TanStack Query-heavy** — same ecosystem, so
  existing data hooks largely survive the move.
- Already shipped this exact stack in **Formos** (Start + oRPC + Drizzle +
  Better Auth) — proven and repeatable.
- **No RSC/caching foot-guns** for an internal operator tool; typed server
  functions are simpler to reason about and harder for agents to break.

Next.js remains an acceptable alternative; the only reason to flip is weighting
agent familiarity + ecosystem + Vercel deploy above the fit above.

## Consequences

- Re-plumb required, but schema and business logic survive (see
  `architecture.md`). Net new: end-to-end types, one deploy, no boundary
  duplication.
- Lucia is removed in favor of Better Auth.
- EduPlan inherits this base as a clone.
- Trade-off accepted: smaller ecosystem and less agent training data for
  TanStack Start than Next.js; mitigated by the thin, typed oRPC boundary.
