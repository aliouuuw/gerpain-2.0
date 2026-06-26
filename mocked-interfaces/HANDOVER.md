# Handover: Platform Shell — Higher-Fidelity Mocks

**For:** Next design / frontend agent  
**From:** Prior exploration session (2026-06-25)  
**Status (2026-06-26):** **IA approved for `apps/gerpain`.** The v2 Ledger shell (tab nav, day context bar, accueil-first) is ported into the real app under `apps/gerpain/src/routes/_shell/` with **static mock data** (`src/mock/operational.ts`). **Theme:** Clinical Sharp only (no switcher). `mocked-interfaces/v2/` remains a reference snapshot; continue UI work in the app.

---

## 1. Mission

Produce **higher-level static mocks** (vanilla HTML/CSS/JS or equivalent lightweight setup) for Gerpain 2.0’s **operator platform shell** (Sprint A). The goal is to let the product owner **choose one IA/UX direction and one visual theme** before any work lands in `apps/gerpain`.

**“Higher level” here means:**

- Stronger **product thinking** and **information hierarchy**, not just skin swaps on the same tables.
- Mocks that feel **70–90% of a finished product** in craft, spacing, typography, and interaction affordances — not wireframes with theme toggles.
- Clear articulation of **why** each layout works for bakery distribution ops, with **realistic flows** (not only list screens).
- Enough fidelity that a manager could look at a mock and say *“I know what I’d do tomorrow morning.”*

Do **not** duplicate shell work in `mocked-interfaces/` — implement in **`apps/gerpain`** unless explicitly asked for a throwaway prototype.

---

## 2. What the stakeholder already decided

### IA/UX — approved family

Only the **Ledger** mental model is admissible:

> The day (or payroll period) is the primary lens. Livraisons, Encaissements, and Soldes are **facets of one operational ledger**, not separate “apps” hidden behind a sidebar.

**Explicit rejection:** Classic **left sidebar + main content** (legacy `nextjs_frontend` pattern). Also rejected after review: Dual-flow terminal, Command palette–first, and Operational river as primary navigation models (they were explored in an earlier iteration; stakeholder preferred Ledger clarity).

**Within Ledger, four sub-dispositions were prototyped** (all still insufficient in craft):

| ID | Name | Idea |
|----|------|------|
| L1 | **Feuillets** | Tabbed sheets (Livraisons / Encaissements / Soldes) + detail rail |
| L2 | **Grand livre** | KPI band + stacked collapsible sections, single scroll |
| L3 | **Matrice** | One row per agent, full loop on one grid |
| L4 | **Cockpit** | Bento dashboard: pulse figure + action queues + module panels |

The stakeholder has **not** picked a winner among L1–L4. Your job is to **propose better Ledger variants** (may refine, merge, or replace these four) with stronger UX rationale.

### Visual — approved constraints

- **All light mode** (operators work in bright back offices; dark themes are out).
- Direction: **soft / sharp modern, neo-futurist** — not generic SaaS, not legacy ERP gray.
- **Theme C (Sunlit Workshop)** was the only prior theme the stakeholder wanted to keep conceptually; A/B/D from the first round were rejected. Second-round themes (Soft Neo, Sharp Grid, Lumen) were **not signed off** either.
- Use attached skills if available: **`impeccable`** (product register) and **`high-end-visual-design`** (craft bar). Run `load-context.mjs` if PRODUCT.md/DESIGN.md exist; this repo currently has **no** PRODUCT.md/DESIGN.md — infer from docs below or run `impeccable teach` if the user wants formal context files.

### What disappointed the stakeholder about current mocks

Summarized from feedback — treat as hard requirements for the next pass:

1. **Too samey** — four layouts read as the same table in different containers; not enough differentiation in *how work gets done*.
2. **Not finished enough** — despite a 70–80% target, result still feels like a **component demo**, not an operator tool.
3. **Weak flow** — little sense of **validate delivery → encaissement appears → record payment → supervisor validates → clôturer**; mocks are mostly static lists.
4. **Theme exploration shallow** — OKLCH token swaps without a coherent **design system** (type scale, elevation rules, motion, empty/loading/error states).
5. **Missing “manager morning”** — no single screen that answers: *Who still owes? What’s draft? What can I validate right now?*
6. **prd.json still says “sidebar”** for Sprint A — **ignore that for shell IA**; stakeholder direction is Ledger-first, no sidebar. Update prd only when a mock is chosen.

---

## 3. Product context (read before designing)

### What Gerpain is

Multi-tenant ERP for **West African bakery chains** (XOF/FCFA). Operators run a daily loop:

```
Sorties (Matin/Soir) → Retours → CA attendu → Encaissement → Écart/solde → Clôture paie
```

- **Livraisons** answer: *What was sold and how much should we receive?*
- **Encaissements** answer: *How much did we actually receive and what is still owed?*
- **Bocal ledger** is financial truth; workflow tables are mutable until validated.

### Primary user for these mocks

**Location manager** (e.g. Aminata Ba in seed) at a desk or counter, **French UI**, switching bakery if multi-site, working **by date** and **by employee period** for collections.

Physical scene (for theme choice): flour-dusted back office, morning light, high-stakes cash reconciliation before the next dispatch wave.

### Seed data (use for realistic copy)

From `packages/db/src/scripts/seed-core.ts`:

| Entity | Values |
|--------|--------|
| Bakery | Boulangerie Centrale (`BC`) |
| Locations | Boutique Centre-ville, Dépôt Principal |
| Agents | Ali Konaté, Amina Diallo, Moussa Traoré (livreurs); Marie Camara (caissier) |
| Manager | Aminata Ba |
| Products | Pain Kilo 1 500 F, Pain Moyen 250 F, Pain Petit 150 F, Croissant 400 F, … |
| Periods | Matin / Soir on delivery items |

### Core screens the shell must eventually host

Not all need full mocks, but the shell IA must **accommodate** them without rework:

| Module | Route (target) | Key UX |
|--------|----------------|--------|
| Accueil / pouls | `/` | Day summary, alerts |
| Livraisons | `/deliveries` | Date nav, all agents pre-populated, Matin/Soir qty, validate |
| Détail tournée | `/deliveries/$runId` | Per-product edit, link to encaissement |
| Encaissements | `/collections` | By date today; later **employee + period** (legacy parity) |
| Détail encaissement | `/collections/$id` | Cash/card/mobile, submit, validate/reject |
| Réconciliations | `/collections/overview` (future) | All employees, balances |
| Paramètres | `/settings/*` (later) | Bakeries, locations, products, employees |

### Money display rules

- Tabular figures for FCFA; `formatXof` pattern in app uses spaced thousands.
- **Variance**: negative = shortage (agent owes), zero = clean, positive = overpayment.
- Status badges: `Brouillon`, `Soumis`, `Validé`, `Rejeté`, `En attente`, `Clôturé` (settled).
- Do not show money KPIs from workflow tables as “truth” in final app — mocks may label “attendu / collecté” from workflow for clarity.

---

## 4. Current codebase state (implementation agent, not mock agent)

| Area | State |
|------|--------|
| App | `apps/gerpain` — TanStack Start, no shared authenticated layout yet |
| Routes | Flat pages with `mx-auto max-w-* p-8`, manual “Accueil” links |
| Bakery | **Hardcoded** `bakeries.data?.[0]` on deliveries/collections pages |
| Auth | Better Auth login; org context on oRPC |
| Legacy reference | `nextjs_frontend` has full sidebar + BakerySelector — **do not copy IA** |

Key files for eventual implementation (out of scope for mock-only agent):

- `apps/gerpain/src/routes/__root.tsx` — only HTML shell today
- `apps/gerpain/src/routes/deliveries.index.tsx`, `collections.index.tsx`
- `prd.json` Sprint A backlog

---

## 5. What to deliver (next agent)

### Minimum deliverable

1. **Written proposal** (1–2 pages) with **2–3 Ledger IA options** (not necessarily L1–L4), each with:
   - Primary object (day? employee-period? bakery-day?)
   - Navigation model (how user moves between Livraisons / Encaissements / Soldes)
   - One **annotated user journey** (morning close for one agent)
   - Pros/cons for this business
2. **Static mocks** at **higher fidelity** than current `mocked-interfaces/`:
   - At least **2 IA options × 2 visual directions** = 4 full-page compositions
   - Include **shared chrome**: bakery selector, date/period, user/role, alert strip
   - Include **at least 2 states** per option (e.g. draft run + submitted collection awaiting validate)
3. **Theme spec** per direction: fonts, neutrals, accent, radius, elevation — documented in mock README or `DESIGN.md` draft.

### Stretch

- Interactive prototype: sheet switch, row select, validate affordance (no backend).
- Mobile / tablet breakpoint for one chosen direction.
- Empty and error states for one module.

### Suggested file layout

```
mocked-interfaces/
  HANDOVER.md          ← this file
  README.md            ← how to run + decision log
  v2/                  ← new work here; keep v1 at root or archive
    index.html
    ...
```

Archive or namespace **v1** so comparisons are possible.

---

## 6. Design laws (from project + skills)

### Must

- **French** copy for all operator strings.
- **Multi-tenant awareness**: bakery switcher always visible; data scoped to selection.
- **Ledger coherence**: delivery validate visibly creates or links encaissement.
- **Light mode only** for this round.
- **No left sidebar** as primary navigation.
- **Accessibility**: focus states, semantic tables, sufficient contrast on light backgrounds.
- **No `any`** if you touch TS later; mocks are HTML/CSS/JS fine.

### Must not (AI slop / banned patterns)

From `impeccable` shared laws:

- Side-stripe accent borders on cards/lists
- Gradient text
- Glassmorphism as default decoration
- Hero-metric template (big number + 3 stat cards) **as the whole product**
- Identical icon+heading+text card grids repeated endlessly
- Modal as first thought for editing quantities

From `high-end-visual-design` (adapt for **product** register, not marketing):

- No Inter, Roboto, Arial, Open Sans as primary UI fonts
- No thick default Lucide everywhere without intent
- No generic 1px gray borders + `shadow-md` as the only depth language
- Motion: custom ease-out curves; animate `transform`/`opacity` only

### Category-reflex check

Avoid “ERP = navy sidebar”, “fintech = dark blue”, “bakery = rustic brown clipart”. Ground choices in the **Dakar manager at 7:30am** scene, not category stereotypes.

---

## 7. Ledger IA — prompts for stronger proposals

Use these as creative constraints for **new** variants:

1. **Period as spine** — Date picker drives everything; encaissements default to “this payroll week” while livraisons stay “this day”. How does one shell show both without two apps?

2. **Agent-centric day board** — Rows are agents; columns are Matin/Soir/CA/encaissement status. Editing happens inline or in a slide-over, not a separate route feel.

3. **Closing ritual** — Explicit “Clôture du jour” step: checklist (all runs validated? all collections submitted? variances explained?) before settle.

4. **Attention layer** — Persistent strip: “2 à valider · 1 brouillon · Marie sans encaissement”. Not a dashboard hero, a **status bar**.

5. **Drill without losing context** — Opening Ali’s tournée should not feel like leaving the ledger; breadcrumb or split view maintains day totals.

6. **Future modules** — Shell should admit Paramètres / Stock / Paie later **without** becoming a 12-item sidebar; consider a compact “Plus” or settings gear, not primary nav noise.

---

## 8. Visual direction — prompts for stronger themes

Stakeholder wants **light**, **modern**, **neo-futurist** spectrum. Propose **three distinct** directions (not four token tweaks):

| Direction | Keywords | Avoid |
|-----------|----------|--------|
| **Warm precision** | Sunlit, cream/wheat neutrals, terracotta accent, soft bezels | Rustic bakery cliché, wood textures |
| **Clinical sharp** | Paper white, hairline grid, cobalt or ink accent, mono money | Cold hospital UI, tiny click targets |
| **Lumen / neo** | Cool white, subtle cyan or violet sheen, crisp type, floating chrome | Cyberpunk neon, dark mode leaks |

Document **one type pairing** and **one elevation rule** per direction. OKLCH for colors is preferred (`impeccable`).

---

## 9. Reference material in repo

| File | Why read |
|------|----------|
| `docs/BUSINESS_OPERATIONS.md` | Delivery ↔ collection link, Matin/Soir, roles |
| `docs/EXPECTATIONS.md` | Phase checklist, legacy parity targets |
| `progress.md` | Sprint A scope, gap vs legacy |
| `prd.json` | Sprint A acceptance criteria (sidebar item is stale) |
| `AGENTS.md` | Money/Bocal rules, French, tenant scoping |
| `mocked-interfaces/index.html` | v1 mocks — what not to repeat |
| `nextjs_frontend/components/ui/navigation/AppSidebar.tsx` | Legacy nav structure (inverse inspiration) |

---

## 10. Running v1 mocks (reference only)

```bash
cd mocked-interfaces
python3 -m http.server 4173
# http://localhost:4173
```

Switchers: Ledger disposition (Feuillets / Grand livre / Matrice / Cockpit) × themes A–D.

---

## 11. Success criteria for mock round v2

Stakeholder will likely approve when:

1. They can **pick one IA** in under 5 minutes of clicking (clear differentiation).
2. At least one mock shows the **full money loop** visually linked, not three disconnected tables.
3. Visual craft feels **shippable** (spacing, type, states), not a Tailwind exercise.
4. Bakery + date + role context feel **always present** without clutter.
5. Design doc explains **what gets built in Sprint A** vs deferred (reconciliations, settings).

---

## 12. After mocks are approved

Hand off to implementation agent with:

- Chosen IA name + screenshot paths
- Chosen theme tokens (export to `apps/gerpain/src/styles.css` or design tokens file)
- Component list: `AppShell`, `BakerySelector`, `DateNav`, `LedgerSheet`, etc.
- Update `prd.json` Sprint A “App shell” item to match chosen IA (remove sidebar requirement).

Implementation order remains: **Sprint A (shell)** → **Sprint D (collections parity)** → **Sprint E (ledger dashboard)** per `progress.md`.

---

## 13. Open questions for stakeholder (optional to ask)

1. Default landing: **Livraisons du jour** or **pouls / cockpit**?
2. Collections in shell: **by day** (current app) or **by employee-period** (legacy parity) as primary?
3. Preference among Ledger sub-types if v2 still uses tabs vs single scroll?
4. Should mocks include **livreur** role view (submit only) or manager-only for now?

## 14. App port (2026-06-26)

| Item | Location |
|------|----------|
| Shell layout | `apps/gerpain/src/routes/_shell.tsx` |
| Routes | `/`, `/livraisons`, `/encaissements`, `/stock`, `/equipe`, `/reglages` |
| Mock data | `apps/gerpain/src/mock/operational.ts` |
| Views | `apps/gerpain/src/views/*` |
| Theme | `apps/gerpain/src/styles/shell.css` — Clinical Sharp tokens on `:root` |
| Wired API (dev) | `/deliveries`, `/collections` — unchanged, outside shell |

**Next UI iterations (mock data OK):** date nav in day bar, livraisons product drill-down, encaissements period mode, réconciliations view.

**Historical data plan:** day lens for Livraisons; employee+period lens for Encaissements; Accueil always today; no separate Reports app.

---

*End of handover. `mocked-interfaces/v2/` is a reference snapshot; active shell work is in `apps/gerpain`.*
