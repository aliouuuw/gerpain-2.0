# UX Audit — Core Loop Modules

> Date: 2026-02-19
> Scope: Employees, Deliveries, Cash Collections, Reconciliations, Dashboard, Cross-cutting

---

## Summary

Full-stack audit of the three core loop modules plus supporting pages. Findings grouped by **data correctness**, **daily workflow friction**, **performance**, and **polish**. Each item references the exact file and line.

---

## 🔴 Data Correctness Issues

### DC-1: Draft delivery runs assigned to wrong location

**Backend:** `gerpain_backend/src/domains/deliveries/routes.ts:88-98`

When auto-creating draft runs, the backend picks `LIMIT 1` from all bakery locations instead of using the employee's primary assigned location from `employee_locations`. Every run gets the same arbitrary location, which is wrong for multi-location bakeries.

**Fix:** Query `employee_locations WHERE isPrimary = true` for each employee. Fall back to first bakery location only if no primary is set.

---

### DC-2: Zero-quantity delivery runs can be validated

**Backend:** `gerpain_backend/src/domains/deliveries/routes.ts:356-447`

No guard on `/runs/:id/validate`. A run where every `quantityEntrusted = 0` creates a `cashCollection` with `expectedAmount = 0`, polluting the collections list with ghost entries.

**Fix:** Reject validation if `sum(quantityEntrusted) = 0` with message: "Impossible de valider une tournée sans quantité confiée."

---

### DC-3: Variance column can go stale

**Backend:** `gerpain_backend/src/domains/collections/routes.ts:259-267`

`variance` is stored in the DB and only recalculated when `actualAmount` is in the PATCH body. If someone patches only `cashAmount` without `actualAmount`, the stored variance goes stale.

**Fix:** Always recompute `variance = (cashAmount + cardAmount + mobileAmount) - expectedAmount` on any PATCH that touches payment fields.

---

### DC-4: Employee deactivate has no confirmation dialog

**Frontend:** `nextjs_frontend/app/(app)/employees/list/page.tsx:354`

`handleDeactivate` fires immediately on icon click. One misclick deactivates an employee with no undo prompt. This is a destructive action.

**Fix:** Wrap in a `ConfirmDialog` like the delivery item delete already uses.

---

### DC-5: Product assignment form race condition

**Frontend:** `nextjs_frontend/app/(app)/employees/list/page.tsx:78-88`

`useEffect` populates `formData.products` only when `employeeProducts.length > 0`. If the employee has 0 assignments, the form keeps stale data from a previous edit session.

**Fix:** Also handle the `length === 0` case by clearing `formData.products` when `editingEmployee` changes.

---

### DC-6: Unsaved delivery changes silently discarded

**Frontend:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx:193-203`

`isDirty` is computed but never surfaced. Clicking another employee row while edits are pending discards all changes without warning.

**Fix:** Show a `ConfirmDialog` when user tries to switch runs while `isDirty === true`: "Vous avez des modifications non enregistrées. Continuer sans sauvegarder ?"

---

## 🟡 Daily Workflow Friction

### WF-1: No employee sort order / reordering in deliveries

**Backend:** `gerpain_backend/src/domains/deliveries/routes.ts:49-59`

Delivery employees fetched with no `ORDER BY`. Frontend renders them in DB insertion order (UUID-based, random).

**Schema change needed:** Add `sortOrder integer default 0` to `employees` table.
**Backend:** Sort by `sortOrder ASC, hireDate ASC NULLS LAST`.
**Frontend (optional later):** Add drag-to-reorder on the deliveries summary table.

---

### WF-2: Employee list sorted by createdAt, not hireDate

**Backend:** `gerpain_backend/src/domains/employees/routes.ts:22-29`

No `ORDER BY` at all. Should sort by `hireDate ASC NULLS LAST` so the most senior employees appear first.

---

### WF-3: No "Aujourd'hui" shortcut on deliveries page

**Frontend:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx:355-397`

Date navigation is ◀/▶ only. If user navigated back several days, there's no button to jump to today.

**Fix:** Add a "Aujourd'hui" button between the arrows.

---

### WF-4: "+ Période" hardcodes "Après-midi"

**Frontend:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx:243-261`

`handleAddPeriodLine` always creates a new item with `period: "Après-midi"`. Should auto-pick the next unused period for that product.

---

### WF-5: No validate/reject UI for submitted collections

**Backend:** Has `POST /:id/validate` and `POST /:id/reject` endpoints (`gerpain_backend/src/domains/collections/routes.ts:311-365`).

**Frontend:** `nextjs_frontend/app/(app)/cash/collections/page.tsx:508-521` — only shows "Saisir" / "Voir" toggle. No action buttons for manager to approve or reject a submitted collection.

**Fix:** When `status === "submitted"`, show "Valider" (green) and "Rejeter" (red) buttons.

---

### WF-6: PaymentForm renders outside the clicked row

**Frontend:** `nextjs_frontend/app/(app)/cash/collections/page.tsx:529-543`

The form appears below the entire table, not inline with the expanded row. Scroll required.

**Fix:** Render as a `<tr>` immediately after the clicked row (accordion pattern inside `<tbody>`).

---

### WF-7: Reconciliations → Collections drill-down doesn't pre-fill employee

**Frontend:** `nextjs_frontend/app/(app)/cash/reconciliations/page.tsx:131-137`

`handleRowClick` pushes to `/cash/collections?employee=...&startDate=...&endDate=...`. But the collections page does NOT read URL search params to pre-fill `selectedEmployeeId` and `periodValue`.

**Fix:** Collections page should initialize state from `useSearchParams()`.

---

### WF-8: "Réinitialiser" button ambiguous in delivery detail

**Frontend:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx:736-749`

Looks identical to "Supprimer". Users may not understand that "Réinitialiser" sets quantities to 0 while "Supprimer" removes the period line entirely.

**Fix:** Rename to "Remettre à zéro" with a different icon (e.g., `RotateCcw`), and only show it when values are non-zero.

---

### WF-9: `commissionRate` column misleading on employee list

**Frontend:** `nextjs_frontend/app/(app)/employees/list/page.tsx:331`

Table shows a global `commissionRate %` but the real commission model is per-product (FCFA/unit via `employee_products`). This column confuses users.

**Fix:** Replace with "Produits assignés" count badge or remove the column.

---

### WF-10: Product assignment panel — no "select all / deselect all"

**Frontend:** `nextjs_frontend/app/(app)/employees/list/page.tsx:544-603`

For a bakery with 15+ products, checking each one individually is tedious.

**Fix:** Add a "Tout sélectionner" / "Tout désélectionner" toggle at the top of the product list.

---

### WF-11: Employee form dialog too narrow

**Frontend:** `nextjs_frontend/app/(app)/employees/list/page.tsx:375`

`max-w-lg` with `max-h-48 overflow-y-auto` product list is cramped.

**Fix:** Use `max-w-2xl` and increase product list height to `max-h-64`.

---

### WF-12: Variance color semantics inverted in collections

**Frontend:** `nextjs_frontend/app/(app)/cash/collections/page.tsx:496-497`

A positive variance means the employee collected MORE than expected (suspicious overpayment), but it's shown in green (`var(--success)`). The reconciliations page gets this right (amber for positive), but the collections page doesn't.

**Fix:** Align with reconciliations: green for 0, red for negative (owes money), amber for positive (overpayment).

---

## 🟠 Performance Issues

### P-1: Collections list — N+1 queries per row

**Backend:** `gerpain_backend/src/domains/collections/routes.ts:167-192`

One `SELECT employees` + one `SELECT deliveryRuns` per collection row. 5 employees × 7 days = 70+ queries per page load.

**Fix:** Batch fetch all employee IDs and delivery run IDs upfront (like the deliveries list already does).

---

### P-2: Collections filter in JS, not SQL

**Backend:** `gerpain_backend/src/domains/collections/routes.ts:121-164`

`startDate`/`endDate`/`employeeId` filters applied in JavaScript after fetching ALL org collections. Same for overview endpoint.

**Fix:** Build proper `WHERE` clauses with `and(gte(date, startDate), lte(date, endDate), ...)` in Drizzle.

---

### P-3: Overview endpoint — N+1 per employee

**Backend:** `gerpain_backend/src/domains/collections/routes.ts:67-92`

`Promise.all(filteredEmployees.map(...))` with inner filtering per employee. Should be a single SQL `GROUP BY employeeId`.

---

### P-4: Single run detail — N+1 per item

**Backend:** `gerpain_backend/src/domains/deliveries/routes.ts:289-301`

`itemsWithProducts` does `Promise.all` with one DB query per item. 10 products × 3 periods = 30 round-trips.

**Fix:** Batch fetch all product IDs in one query (like the list endpoint already does).

---

### P-5: Settle endpoint — sequential UPDATE per row

**Backend:** `gerpain_backend/src/domains/collections/routes.ts:453-459`

Settling 30 collections = 30 individual UPDATE statements.

**Fix:** `UPDATE cash_collections SET is_settled = true WHERE id IN (...)` in a single query.

---

### P-6: Employee list — N+1 for locations

**Backend:** `gerpain_backend/src/domains/employees/routes.ts:41-52`

One `SELECT employeeLocations` per employee. 10 employees = 11 queries.

**Fix:** Batch fetch all locations in one query using `inArray(employeeLocations.employeeId, employeeIds)`.

---

## 🟢 Polish & Misc

### PO-1: Dashboard is entirely hardcoded

**Frontend:** `nextjs_frontend/app/(app)/dashboard/page.tsx:20-76`

All stats, activity, and alerts are static `const` arrays. Dashboard shows "847 500 FCFA" and "24 tournées" regardless of real data. Development notice says "enrichi avec des graphiques" but it's literally all fake.

**Note:** This is already tracked as P1 task #15 in prd.json.

---

### PO-2: No error boundaries anywhere

No `error.tsx` files exist in the app. An unhandled exception in any page crashes the entire app shell.

**Fix:** Add `app/(app)/error.tsx` as a catch-all error boundary with retry button.

---

### PO-3: Email/phone icons render when values are empty

**Frontend:** `nextjs_frontend/app/(app)/employees/list/page.tsx:294-303`

`<Mail className="size-3" />` renders next to an empty string when employee has no email.

**Fix:** Conditionally render only when `emp.email` / `emp.phone` are truthy.

---

### PO-4: Sidebar `isActive` is always false

**Frontend:** `nextjs_frontend/components/ui/navigation/AppSidebar.tsx:30, 40-101`

Every nav item has `active: false` hardcoded. The current page is never highlighted in the sidebar.

**Fix:** Use `usePathname()` to compute `isActive` dynamically.

---

### PO-5: Many "Vue d'ensemble" pages are static placeholders

Multiple pages are placeholder cards with bullet lists and no data:
- `/sales`, `/cash`, `/employees`, `/inventory`
- `/employees/attendance`, `/inventory/adjustments`, `/inventory/transfers`
- `/payroll/*` (entire section)

**Note:** Expected at this stage. Not blocking.

---

### PO-6: Main content has no padding on mobile

**Frontend:** `nextjs_frontend/app/(app)/layout.tsx:63`

`<main className="... sm:p-6">` — below `sm` breakpoint there's zero padding, content touches screen edges.

**Fix:** Add `p-4 sm:p-6`.

---

### PO-7: Dead code — `employeeOptions` computed but unused

**Frontend:** `nextjs_frontend/app/(app)/cash/collections/page.tsx:250-256`

`employeeOptions` is built with `useMemo` but the Select uses inline `employees.map(...)` instead.

**Fix:** Remove the unused variable or use it in the Select.

---

### PO-8: `useSearchParams()` imported but URL not synced in reconciliations

**Frontend:** `nextjs_frontend/app/(app)/cash/reconciliations/page.tsx:77-82`

URL params are read on mount but never written back when filters change. If user bookmarks or shares the URL, it won't reflect the current filter state.

---

## Priority Implementation Order

### Phase 1 — Data Integrity (before more data accumulates)
1. DC-1: Fix draft run location assignment
2. DC-2: Block zero-quantity validation
3. DC-3: Fix variance computation
4. WF-1 + WF-2: Employee sortOrder + hireDate ordering

### Phase 2 — Workflow Gaps
5. DC-4: Deactivate confirmation dialog
6. DC-5: Product assignment form race condition
7. DC-6: Unsaved changes warning on delivery page
8. WF-5: Validate/reject UI for collections
9. WF-6: PaymentForm accordion pattern
10. WF-7: Collections reads URL search params

### Phase 3 — Performance
11. P-1 + P-2 + P-3: Collections backend batch queries + SQL filters
12. P-4: Single run detail batch queries
13. P-5: Settle batch UPDATE
14. P-6: Employee list batch locations

### Phase 4 — Polish
15. WF-3: "Aujourd'hui" button
16. WF-4: Auto-pick next period
17. WF-8-12: Minor UX tweaks
18. PO-1–PO-8: Error boundaries, sidebar active state, mobile padding, etc.
