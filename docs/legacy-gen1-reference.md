# Legacy Gen-1 Reference (Prisma Monolith)

**Source:** Cloned app at repo root `gerpain/` (Next.js 15 + Prisma + server actions).  
**Removed:** 2026-06-26 — this file preserves operational knowledge not fully spelled out elsewhere.

**Closer migration parity:** `gerpain_backend/` + `nextjs_frontend/` (split stack, per-product deliveries).  
**Schema mapping:** see `MIGRATION_GUIDE.md`.

---

## What Gen-1 Was

Single Next.js app: magic-link auth, one admin per bakery chain, multiple stores, Prisma/PostgreSQL. No ledger (Bocal), no multi-tenant org layer, no RBAC audit trail.

### Modules (live UI)

| Route | Module | Status in gen-1 |
|-------|--------|-----------------|
| `.../dashboard` | Accueil | **Working** — KPIs, charts, top livreurs |
| `.../livraisons` | Livraisons | **Working** — Livreurs + Boutique tabs |
| `.../encaissements` | Encaissements | **Working** — unpaid collections |
| `.../encaissements/historique` | Historique encaissements | **Working** — paid archive |
| `.../rh` | RH / paie | **Working** — salary overview |
| `.../rh/[employee]` | Fiche employé | **Working** — bonuses, advances, payslips |
| `.../stock` | Stock | **Working** — CRUD + reorder alerts |
| `.../stock/[id]/history` | Mouvements stock | **Working** — movement ledger, CSV export |
| `.../parametres` | Réglages | **Mostly stubs** |

---

## Business Rules Worth Carrying Forward

### 1. Livreur delivery model (simpler than 2.0)

- One **aggregate bread bucket** per agent per day (not per product).
- `outgoingBread` JSON: `{ morning, night }`; single `returnedBread` count for the whole run.
- Revenue: `(morning + night − returned) × employee.unitPrice`.
- Flat `employee.commission` (not per-product `commissionPerUnit`).

**2.0 difference:** per-product `delivery_items`, per-product commission, validate-then-collect.

### 2. Boutique / POS deliveries

- **Fully implemented** in gen-1 (`ShopDelivery` + `BreadDelivery` per bread type, Matin/Soir).
- Cash collection auto-created on save.
- **2.0 status:** deferred in `EXPECTATIONS.md`; unified into `deliveryRuns` + `deliveryItems` in schema.

### 3. Cash collections (simpler workflow)

- Created on **delivery save**, not on validate.
- Fields: `revenue`, `collectedCash`, `remainder` (no cash/card/mobile split).
- Settlement: `isPaid` boolean; bulk mark paid/unpaid.
- **Paid history:** dedicated `/encaissements/historique` page.
- **Remainder resync:** manual admin action recalculates `remainder = revenue − collectedCash` (listed P2 in 2.0).

**2.0 difference:** validate → collection; status workflow; payment breakdown; `isSettled` for payroll; Bocal posting on validate.

### 4. Payroll / RH (richest gen-1 module)

| Feature | Behavior |
|---------|----------|
| **Bonuses** | One-time or recurring (`recurringMonths`, `remainingMonths`) |
| **Advances** | Same recurrence model; deducted on payslip |
| **Payslip generation** | Custom date range; `daysWorked` proration |
| **Net pay** | `baseSalary + bonuses + commission − advances − collection remainders` |
| **Mark payslip paid** | Side-effect: marks related period collections `isPaid` |
| **PDF export** | `react-to-pdf` on payslip view |
| **Salary overview** | Monthly grid for non-livreur staff |

**2.0 status:** payroll tables not in schema yet (`MIGRATION_GUIDE.md` §4); module not built.

### 5. Mobile salary disbursement (Pawapay)

- `payment-actions` integrates **Pawapay** API for Orange Money–style payouts to employees.
- **Not documented** in `BUSINESS_OPERATIONS.md` or `EXPECTATIONS.md` — decide if 2.0 needs this or manual bank/cash only.

### 6. Separation of duties (implemented in gen-1)

| Role | Can edit | Route guard |
|------|----------|-------------|
| `OUT_MANAGER` | Outgoing (Matin/Soir) only | Middleware → `/livraisons` only |
| `IN_MANAGER` | Returns only | Same |
| Admin | Everything | Full dashboard |

- Employee **magic-link login** (separate from admin session).
- **2.0 status:** P2 deferred; manager login via Better Auth not specced for field roles.

### 7. Inventory

- `StockItem` categories: `MATIERE_PREMIERE`, `UTILITE`, `CONSOMMABLE`.
- Reorder points; manual adjustments.
- `StockMovement` audit trail (IN/OUT) with edit/delete and **CSV export**.
- **Not linked** to delivery runs (stock does not auto-decrement on sorties).

**2.0 status:** `inventoryItems` in schema; `StockMovement` table missing; shell UI is mock-only.

### 8. Dashboard (working in gen-1)

- Today’s sales, delivery count, active livreurs.
- 7-day sales chart, bread distribution chart, top 5 livreurs.
- **2.0 status:** P1 in `EXPECTATIONS.md`; shell Accueil uses mock task list.

### 9. Store onboarding

- `CreateStoreDialog`: one flow creates store + default shop + default cashier + three bread types (Kilo/Moyen/Petit).

### 10. Employee roles (gen-1 enum)

`CAISSIER | LIVREUR | OUT_MANAGER | IN_MANAGER | BASIC`  
Mapped in `MIGRATION_GUIDE.md` to 2.0 text roles.

---

## Explicitly Out of Scope in Gen-1

- Bocal / append-only ledger
- Collection validate/reject workflow
- Per-product employee assignments
- `pricingRules`, RBAC, audit logs
- Damaged/expired return tracking (user story in 2.0 docs only)

---

## Build Priority Hints (from gen-1 gaps)

When planning 2.0 beyond the core loop:

1. **Dashboard** — gen-1 proves operators expect real KPIs on Accueil.
2. **Paid collection history** — separate archive view or filter (not a new “Reports” app).
3. **Payroll module** — gen-1 is the requirements reference for payslip math and collection netting.
4. **POS boutique** — gen-1 UI exists; 2.0 schema already unifies the model.
5. **Stock movements** — add table + history UI before treating inventory as done.
6. **Pawapay / mobile payout** — product decision needed.
7. **OUT/IN manager field login** — product decision vs manager-only back office.

---

*Gen-1 code was untracked in git. Recover from local backup or re-clone if needed. For delivery/collection behavior parity, prefer `nextjs_frontend/` over gen-1.*
