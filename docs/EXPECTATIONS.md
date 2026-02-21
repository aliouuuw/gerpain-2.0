# Gerpain MVP — Functional Expectations

> Based on the real business operations documented in `BUSINESS_OPERATIONS.md`.
> Adapted to the current codebase architecture (Hono backend, Next.js frontend, Drizzle ORM).
> Last updated: 2026-02-21

---

## Business Model Summary

Gerpain is an ERP for **bakery chains** operating in West Africa (currency: **XOF / FCFA**).

A bakery distributes **products** — primarily bread (Pain Kilo, Pain Moyen, Pain Petit) but also viennoiseries, drinks, and other consumables — through **two sales channels**:

1. **Sales agents (livreurs)** — take products out on vehicles, sell in the field, bring back unsold items
2. **Point of sale (boutique)** — products sold at the physical shop by cashiers (caissiers)

Products leave the warehouse in **morning and/or night batches** (Matin/Soir). The daily cycle is:
```
Products leave warehouse (Matin/Soir) → Some come back unsold → Revenue calculated → Cash collected → Balance tracked
```

**Deliveries** answer: *"What was sold and how much should we receive?"*
**Cash collections** answer: *"How much did we actually receive and what is still owed?"*

The outstanding balance (remainder) feeds into **payroll and commission calculations**:
- Commissions are computed from what was sold, using **per-product commission rates** for the products the employee is assigned/allowed to sell
- Outstanding balances (shortages/overages) adjust the final net salary
- Collections are grouped by **flexible payroll periods** (not strictly monthly)

### ERP Terminology

| Gerpain Term | ERP Concept |
|---|---|
| Product (Pain Kilo, Pain Moyen…) | Product with a unit price |
| Livreur (delivery guy) | Sales agent / field representative |
| Boutique (shop) | Point of sale (POS) |
| Location | Warehouse / store (holds inventory, employees, operations) |
| Outgoing quantities (Matin/Soir) | Outbound shipment |
| Returned quantities | Sales return |
| Revenue | Accounts receivable |
| Cash collection | Payment receipt / cash settlement |
| Remainder | Outstanding balance (receivable − payment) |
| Commission | Sales commission (per-product rate) |
| Payslip | Payroll entry |

### Separation of Duties

For accountability, outbound and return recording should be handled by **different roles**:
- **OUT_MANAGER** records outgoing quantities (morning/night) — cannot edit returns
- **IN_MANAGER** records returned quantities — cannot edit outgoing

This is a P2 feature but is a core business concept that shapes the data model.

---

## Phase 0 — Setup Prerequisites

These must work before any daily operation can happen.

### 0.1 Auth & Organization
| # | Expectation | Current State |
|---|-------------|---------------|
| 1 | Admin signs up / logs in | ✅ Works |
| 2 | Auth persisted, API calls use token | ✅ Works |
| 3 | Organization created on first login | ✅ Works |

### 0.2 Bakery
| # | Expectation | Current State |
|---|-------------|---------------|
| 4 | Create bakery (name, code) from BakerySelector | ✅ Works |
| 5 | Switch between bakeries; data scoped to selected bakery | ✅ Works — all API clients send X-Bakery-ID header |

### 0.3 Locations
| # | Expectation | Current State |
|---|-------------|---------------|
| 6 | Create locations (shops, warehouses) under selected bakery | ✅ Works |
| 7 | Locations appear as options in delivery and collection forms | ✅ Works — deliveries and collections use real locations |
| 8 | Edit / deactivate locations | ✅ Works |

### 0.4 Products
| # | Expectation | Current State |
|---|-------------|---------------|
| 9 | Create product categories (Pain, Viennoiserie, Boissons, Consommables…) | ✅ Works |
| 10 | Create products with name, category, unit price in FCFA (e.g. Pain Kilo 1500, Pain Moyen 250, Pain Petit 150, Croissant 400, Jus d'orange 800) | ✅ Works |
| 11 | Products available for selection in delivery forms | ✅ Works — deliveries use real products from API |

### 0.5 Employees
| # | Expectation | Current State |
|---|-------------|---------------|
| 12 | Create employees with role: `delivery`, `cashier`, `manager`, `baker` | ✅ Works |
| 13 | Delivery agents selectable when creating delivery runs | ✅ Works — backend auto-creates runs for active delivery employees |
| 14 | Cashiers selectable when recording POS sales / collections | ⚠️ Collections: ✅, POS sales: deferred (clients don't use POS initially) |
| 15 | For delivery guys and cashiers (treated as agents): assign **allowed products** + commission per product; set base salary | ✅ Works — employee_products table with per-product commissionPerUnit + baseSalary on employees |

---

## Phase 1 — Deliveries (Outbound Shipments & Returns)

The core recording flow. Must support both sales channels.

### 1.1 Sales Agent Deliveries

The main flow: navigate to a date → all active delivery agents are pre-populated → manager fills in quantities and saves.

Deliveries happen **daily with the same agents and products**. The page loads a **pre-populated form** — no dialogs or manual run creation needed. The backend auto-creates draft runs for all active delivery employees when the page is first accessed for a date.

| # | Expectation | Current State |
|---|-------------|---------------|
| 16 | Navigate to a date (◀/▶ buttons + calendar) and see **pre-populated** delivery runs for all active delivery agents | ✅ Works — date nav + auto-created draft runs |
| 17 | Backend auto-creates draft runs for active delivery employees (with the employee's **assigned/allowed products** at qty 0; fallback = all active bakery products) when a date is first accessed | ✅ Works |
| 18 | Record **quantities entrusted** per product per period (Matin/Soir batches) — e.g. Pain Kilo: 60 Matin, 40 Soir | ✅ Works — real products from API |
| 19 | Record **quantities returned** (ideally by a different person — OUT_MANAGER vs IN_MANAGER separation) | ✅ Works — separation of duties is P2 |
| 20 | System auto-calculates per item: `sold = entrusted - returned`, `revenue = sold × unitPrice` | ✅ Works |
| 21 | System shows per-run totals: total entrusted, returned, return rate %, sold, revenue in FCFA | ✅ Works |
| 22 | Save run as draft (persists to DB, editable later) | ✅ Works — local editable state with save button |
| 23 | Validate run (locks it, triggers downstream: collection creation) | ✅ Works — auto-creates cash collection on validate |
| 24 | Add notes to a run (damage, special circumstances) | ✅ Works — persisted to DB |

### 1.2 Point-of-Sale (Boutique) Deliveries

Products sold at the physical shop, tracked **per product type** (e.g. Pain Kilo, Pain Moyen, Pain Petit, Croissant, Jus…) with a **cashier (caissier)** responsible.

| # | Expectation | Current State |
|---|-------------|---------------|
| 25 | Record POS sales: cashier + location + date + products with quantities sold | ⏸️ Deferred — clients don't use POS initially |
| 26 | Outbound and returned quantities per product type (same Matin/Soir split) | ⏸️ Deferred |
| 27 | Revenue calculated per product type and total in FCFA | ⏸️ Deferred |

> **Note:** POS is deferred because clients focus on delivery operations first. The `deliveryRuns` model is generic and will handle POS when needed — the employee's `role` field (delivery vs cashier) distinguishes the channel. No schema change needed.

### 1.3 Data Integrity
| # | Expectation | Current State |
|---|-------------|---------------|
| 28 | Delivery data persists across page reloads | ✅ Works — saved to DB via API |
| 29 | Validated runs cannot be edited | ✅ Works — validated runs are read-only in UI |
| 30 | Unit price snapshot saved at time of delivery (not affected by later price changes) | ✅ Works — `deliveryItems.unitPrice` saved on creation |

---

## Phase 2 — Cash Collections (Payment Receipts)

Tracks actual money received vs expected revenue from deliveries.

The cash collection system answers: *"Given what was sold, how much should we receive, how much did we actually receive, and what is the outstanding balance?"*

Collections are viewed **per employee across a payroll period** — not just per day. This gives managers a complete picture of each employee's balance over time.

### 2.1 Collection Creation
| # | Expectation | Current State |
|---|-------------|---------------|
| 31 | When a delivery run is validated, a cash collection record is **auto-created** with `expectedAmount = sum of (sold × unitPrice)` for all items in the run | ✅ Works |
| 32 | Collection linked to its source delivery run (`deliveryRunId` FK) | ✅ Works — `deliveryRunId` FK added |
| 33 | For POS: collection created from POS delivery validation (same mechanism, cashier role) | ⏸️ Deferred with POS |

### 2.2 Recording Payments
| # | Expectation | Current State |
|---|-------------|---------------|
| 34 | Manager selects an employee and sees all their collections for a **payroll period** (not just one day) | ✅ Works — employee-centric period view |
| 35 | Each collection row shows the delivery/POS detail for that day (products, quantities, revenue) with a link back to the source delivery | ✅ Works — delivery detail summary inline |
| 36 | Manager enters **actual amount collected** (cash + card + mobile breakdown) inline per collection | ✅ Works — inline payment recording |
| 37 | System calculates **remainder** = expectedAmount − actualAmount. Negative = money owed; positive = overpayment | ✅ Works — variance computed and displayed |
| 37b | Period summary shows: total expected, total collected, outstanding balance, collection rate % | ✅ Works — summary cards |

### 2.3 Collection Workflow
| # | Expectation | Current State |
|---|-------------|---------------|
| 38 | Submit collection for validation | ✅ Works |
| 39 | Manager validates or rejects (with reason) | ✅ Works |
| 40 | Mark collections as **settled** for payroll (`isSettled` flag) | ✅ Works — `isSettled` field + settle endpoint |
| 41 | Assign collections to **flexible payroll periods** (e.g., "Jan-2026", "Week-3", "01/02–15/02") — not strictly monthly | ✅ Works — `period` field + period selector |
| 42 | Recalculate remainders if delivery data is corrected (resync) | ❌ Not implemented (P2) |

### 2.4 Collection Overview (All Employees)
| # | Expectation | Current State |
|---|-------------|---------------|
| 43 | Birds-eye view: all employees with their period totals (expected, collected, balance) | ✅ Works — /cash/reconciliations |
| 44 | Filter by role (livreur/caissier), settled/unsettled status | ✅ Works |
| 45 | Click an employee → drills into their detailed collection view (Phase 2.2) | ✅ Works — navigates to /cash/collections with pre-selected employee + period |

---

## Phase 3 — The Delivery↔Collection Link

This is the bridge between the two core operations.

| # | Expectation | Current State |
|---|-------------|---------------|
| 46 | Validating a delivery auto-creates a collection with correct expected amount | ✅ Works |
| 47 | Collection shows which delivery run it was generated from | ✅ Works — deliveryRunId FK |
| 48 | If delivery is corrected and re-validated, collection expected amount updates | ❌ Not implemented (P2) |
| 49 | Admin can reconcile: "expected from deliveries" vs "actually collected" per employee per day | ✅ Works — reconciliations page |

---

## Phase 4 — Visibility (Dashboard & Basic Reporting)

| # | Expectation | Current State |
|---|-------------|---------------|
| 50 | Dashboard: today's total revenue (from validated deliveries) | ❌ Placeholder (P1) |
| 51 | Dashboard: unsettled collections count & amount | ❌ Placeholder (P1) |
| 52 | Dashboard: outstanding balances (remainders) summary | ❌ Placeholder (P1) |
| 53 | Delivery history filterable by date range, employee, location | ❌ Not implemented (P1) |
| 54 | Collection history filterable by date range, employee, settled/unsettled | ❌ Not implemented (P1) |

---

## Schema Gaps

Changes needed in `gerpain_backend/src/shared/database/schema.ts`:

| Change | Status |
|--------|--------|
| Add `deliveryRunId` FK to `cashCollections` | ✅ Done (migration 0007) |
| Add `isSettled` boolean to `cashCollections` | ✅ Done (migration 0007) |
| Add `period` text to `cashCollections` | ✅ Done (migration 0007) |
| Add `employee_products` junction table (per-product commission) | ✅ Done (migration 0006) |
| Add `baseSalary` to employees | ✅ Done (migration 0006) |

All schema gaps have been addressed. The schema is complete for the core loop.

---

## Build Plan — Priority Order

### ✅ Done — Core Loop

All completed and verified:
- Deliveries page wired to real API (pre-populated daily form, save/validate)
- Schema patches (deliveryRunId, isSettled, period on cashCollections; employee_products; baseSalary)
- Auto-create cash collection on delivery validation
- Cash collection recording (employee-centric period view with inline payment)
- Cash collection overview (all-employees birds-eye view with drill-down)
- Employee product assignments with per-product commission
- Employee sortOrder + hireDate ordering
- Data integrity fixes (draft location, zero-qty guard, variance recomputation)
- Workflow fixes (deactivate confirm, unsaved changes warning, validate/reject UI, inline accordion, URL params)

### Next — Performance & Usability

```
1. Collections backend — batch queries and SQL filters (eliminate N+1)
2. Deliveries + employees backend — batch queries (eliminate N+1)
3. Dashboard with real KPIs (today's revenue, collection status, outstanding balances)
4. Delivery and collection history with date/employee/location filters
5. Delivery page UX polish (Aujourd'hui button, auto-pick period, reset button)
6. Employee page UX polish (product count badge, select all, wider dialog)
7. Cross-cutting polish (error boundary, sidebar active state, mobile padding)
```

### Deferred

```
- POS delivery flow (Vente Boutique) — clients don't use POS initially
- Separation of duties (OUT_MANAGER / IN_MANAGER)
- Commission calculation and payroll integration
- Recalculate remainders on delivery correction
- CSV export
- Stock auto-update from deliveries
- Database indexes for scale (partially done — 4 indexes applied)
- Audit trail writes
```

---

## Success Criteria

The MVP is **functional** when an admin can:

1. ✅ Create a bakery, locations, products, and employees with assigned products, commissions, and salary
2. ✅ Open deliveries page → see all agents pre-populated → fill in quantities → save → validate
3. ✅ Validate the delivery → collection auto-created with correct expected amount
4. ✅ Open collections → select employee → see their period collections → record payment → variance shown
5. ✅ See all employees' balances in the overview → click through to detail
6. ❌ Dashboard with real KPIs (next priority)
7. ❌ History filters on deliveries and collections (next priority)

**Core loop is complete.** Remaining work focuses on performance (N+1 query cleanup), visibility (dashboard + filters), and UX polish.
