# UI Flows — Mapping Expectations to Frontend

> Concrete page-by-page sketch of what needs to change or be built, referencing the existing frontend structure.
> All examples use real Gerpain context: West African bakery chain, currency **FCFA (XOF)**, products like Pain Kilo (1 500 FCFA), Pain Moyen (250 FCFA), Pain Petit (150 FCFA), Croissant (400 FCFA), Jus d'orange (800 FCFA).
> See `EXPECTATIONS.md` for ERP terminology mapping and `BUSINESS_OPERATIONS.md` / `BUSINESS_OPERATIONS_erp.md` for full business context.

---

## Current Frontend Map

### Sidebar Navigation
```
Tableau de bord        → /dashboard              (hardcoded mock stats)
Ventes
  ├ Vue d'ensemble     → /sales                  (placeholder)
  ├ Livraisons         → /sales/deliveries       (930 lines, full UI, ALL MOCK DATA)
  ├ Vente boutique     → /sales/transactions     (POS quick-entry, mock products)
  └ Produits           → /sales/products         (✅ wired to API)
Collectes
  ├ Vue d'ensemble     → /cash                   (placeholder)
  ├ Encaissements      → /cash/collections       (list wired to API, no create/edit)
  └ Historique         → /cash/reconciliations   (exists, status unknown)
Stock
  ├ Niveaux            → /inventory/stock        (✅ wired)
  ├ Catégories         → /inventory/categories   (✅ wired)
  └ Tarifs             → /inventory/pricing      (✅ wired)
Employés
  ├ Liste              → /employees/list         (✅ wired)
Paramètres
  ├ Organisation       → /settings/organization  (✅ wired)
  ├ Boulangeries       → /settings/bakeries     (✅ wired)
  └ Localisations      → /settings/locations    (✅ wired)
```

### Component Library Available
```
Primitives: Button, Card, Divider, Drawer, Input, Logo, Sidebar
UI:         Badge, DatePicker, Dialog, ConfirmDialog, Select, Table, Tabs, Toast
Domain:     BakerySelector, LocationSelector, UserProfile, Breadcrumbs
Hooks:      useEmployees, useProducts, useCategories, useLocations, useBakeries,
            useDeliveries (exists but unused), useCollections (partially used),
            useInventory, usePricing
```

---

## Phase 0 — Setup ✅ Complete

Setup pages are fully functional, including employee product assignments with per-product commission rates.

| Expectation | Page | Status |
|-------------|------|--------|
| #1–3 Auth | Auth pages (outside `(app)`) | ✅ |
| #4–5 Bakery | `BakerySelector` in sidebar | ✅ |
| #6–8 Locations | `/settings/locations` | ✅ |
| #9–11 Products | `/sales/products` + `/inventory/categories` | ✅ |
| #12–15 Employees | `/employees/list` | ✅ Product assignments + per-product commission + baseSalary |

### Page: `/employees/list` (Agent Setup Adjustment)

When creating/editing an employee with role **Livreur** or **Caissier (treated as an agent)**:

1. Select role (Livreur / Caissier)
2. Set salary fields (base salary and/or other payroll inputs)
3. Assign allowed products + commission **per product**

Sketch (modal or drawer attached to employee create/edit):
```
┌──────────────────────────────────────────────────────────────────────┐
│  Nouvel employé                                                      │
│                                                                      │
│  Nom            [Ali K.]                                             │
│  Rôle            [Livreur ▼]                                         │
│  Salaire base    [150 000] FCFA                                      │
│                                                                      │
│  Produits autorisés + commission                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Produit        Autorisé   Commission (FCFA / unité)            │  │
│  │ Pain Kilo      [✓]        [   25]                              │  │
│  │ Pain Moyen     [✓]        [    5]                              │  │
│  │ Pain Petit     [ ]        [    0]                              │  │
│  │ Croissant      [✓]        [   10]                              │  │
│  │ Jus d'orange   [ ]        [    0]                              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [Annuler]                                   [Enregistrer]          │
└──────────────────────────────────────────────────────────────────────┘
```

This configuration drives:
- Which products are pre-populated for an agent’s daily delivery form
- Commission computation (sum of sold(product) × commissionRate(employee, product))

---

## Phase 1 — Deliveries Page Rewrite ✅ Complete

### Page: `/sales/deliveries`
**File:** `app/(app)/sales/deliveries/page.tsx` (rewritten)

Fully wired to real API. All mock data replaced with API hooks. Date navigation, save, and validate all functional.

#### Design Principle: Pre-populated Daily Form

Deliveries happen **every day** with the **same employees and products**. There is no need for a "create run" dialog. Instead:
- When the page loads for a date, the system checks if delivery runs exist for all active delivery employees.
- If not, it **auto-creates draft runs** for each delivery employee (with their default location and the bakery's active products).
- The manager sees a **ready-to-fill form** — just enter quantities and save.

This matches the real workflow: the manager opens the page each morning, sees all their delivery agents listed, fills in what each agent takes, and saves.

#### Implemented Flow
```
1. Page loads for today's date
   └ GET /delivery-runs?date=YYYY-MM-DD
   └ Backend auto-creates draft runs for all active delivery employees
   └ Each run pre-populated with employee's assigned products at qty 0
2. Manager sees all employees listed immediately — no dialogs, no setup
3. Manager clicks "Détails" on a run → edits quantities inline
4. Manager edits quantities locally → clicks "Enregistrer" to save batch
5. Manager clicks "Valider la tournée":
   └ POST /runs/:id/validate → locks run, auto-creates CashCollection
   └ Toast: "Tournée validée — collecte de X FCFA créée automatiquement"
```

#### UI Components

**Header with Quick Date Navigation**
```
┌──────────────────────────────────────────────────────────────────────┐
│  Tableau des livraisons                                              │
│  Gérez les livraisons par livreur · Confiés, retours et recettes    │
│                                                                      │
│                          [◀] 07 fév. 2026 [▶]  [📅]                │
│                               Vendredi                               │
└──────────────────────────────────────────────────────────────────────┘
```

- **[◀] [▶]** buttons: prev/next day (single click, no calendar open)
- **Date label** shows formatted date + day of week for context
- **[📅]** opens full DatePicker for jumping to a specific date
- Clicking ◀/▶ refetches `useDeliveryRuns({ date })`

**Card 1: "Vue d'ensemble par livreur"** (runs summary table — pre-populated)

Example: Ali delivers Pain Kilo (1 500 FCFA) and Pain Moyen (250 FCFA). Amina delivers Pain Petit (150 FCFA) and Croissant (400 FCFA). All amounts in FCFA.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Vue d'ensemble par livreur                                          │
│  Cliquez sur « Détails » pour saisir les quantités par produit      │
│                                                                      │
│  Livreur       Confié  Produits  Retour  %Ret  Vendu  Montant  Statut│
│  ──────────────────────────────────────────────────────────────────  │
│  Ali K.          150       2       12    8%     138  145 500   Brouill│
│  Amina D.         80       2        5    6%      75   21 250   Validé │
│  Moussa T.         0       0        0     —       0        0   Brouill│
│  ──────────────────────────────────────────────────────────────────  │
│  Total journée   230       4       17    7%     213  166 750         │
└──────────────────────────────────────────────────────────────────────┘
```

Key behaviors:
- **All active delivery employees appear** — even those with 0 quantities (unfilled drafts)
- **Employee names** from `useEmployees({ role: 'delivery' })` instead of `mockEmployees`
- **Data** from `useDeliveryRuns({ date })` — pre-created by backend
- **Validated rows** show lock icon, "Détails" becomes "Voir" (read-only)
- **Moussa at 0** means the manager hasn't filled his data yet — not that he has no run

**Card 2: "Détail par produit"** (selected run detail — pre-populated with products)

Example: Ali K. delivers Pain Kilo and Pain Moyen with Matin/Soir batch split. All bakery products are pre-populated at qty 0. Revenue = sold × unitPrice.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Détail par produit                                                  │
│  Ali K. · Centre-ville · ven. 07 fév.      [Brouillon] [Fermer]    │
│                                                                      │
│  Produit          Prix    Confié  Retour  %Ret  Vendu  Total        │
│  ──────────────────────────────────────────────────────────────────  │
│  Pain Kilo       1 500    [100]   [12]    12%    88   132 000       │
│    └ Matin                [ 60]   [ 8]                              │
│    └ Soir                 [ 40]   [ 4]                              │
│  Pain Moyen        250    [ 50]   [ 0]     0%    50    12 500       │
│  Pain Petit        150    [  0]   [  0]     —     0         0       │
│  Croissant         400    [  0]   [  0]     —     0         0       │
│  Jus d'orange      800    [  0]   [  0]     —     0         0       │
│  ──────────────────────────────────────────────────────────────────  │
│                                                                      │
│  [+ Ajouter un produit ▼]  (for ad-hoc products not in default set) │
│                                                                      │
│  Confié: 150 pièces · 144 500 FCFA                                  │
│  Retour: 12 pièces · 8.0%                                           │
│  Vendu: 138 pièces · 144 500 FCFA                                   │
│                                                                      │
│  Remarques: [textarea — e.g. "2 Pain Kilo endommagés au retour"]    │
│                                                                      │
│  [Enregistrer comme brouillon]  [Valider la tournée]                │
└──────────────────────────────────────────────────────────────────────┘
```

Key behaviors:
- **All bakery products pre-populated** at qty 0 — manager just fills in numbers
- Products with qty 0 shown in muted style (still visible, easy to fill)
- **Matin/Soir batch split** toggleable per product
- **"+ Ajouter un produit"** only needed for ad-hoc items not in the bakery's product catalog
- **Quantity inputs** debounce → PATCH to API on blur
- **Unit price snapshot** saved at time of delivery (not affected by later price changes)
- **Validated run** → all inputs disabled, save/validate buttons hidden
- **Revenue formula**: sold × unitPrice (e.g. 88 Pain Kilo sold × 1 500 = 132 000 FCFA)

---

### Page: `/sales/transactions` (Vente Boutique / POS Sales)
**File:** `app/(app)/sales/transactions/page.tsx` (282 lines)

This is the **Point of Sale (Boutique)** channel. Products sold directly at the physical shop by a **caissier/caissière** (cashier).

The page has a nice quick-entry UI for POS sales. The approach:
- **Keep the quick-entry UX** (product cards with +/- buttons, checkout summary)
- Wire to API: real products (Pain Kilo, Pain Moyen, Pain Petit, Croissant, Jus...) from `useProducts()`
- Save creates a `deliveryRun` with employee role=cashier

#### Target Flow
```
1. Page loads → useProducts() fetches real products (Pain Kilo 1 500, Pain Moyen 250, etc.)
2. Cashier (caissier) selects quantities via +/- buttons (existing UI, keep as-is)
3. Payment mode selection (existing: Espèces/Carte/Mobile Money)
4. "Enregistrer la vente" button:
   └ Creates a deliveryRun { employee: current caissier, location: current boutique, date: today }
   └ Creates deliveryItems for each selected product (Pain Kilo × 30, Pain Moyen × 50...)
   └ Auto-validates (POS sales are immediate, no draft state)
   └ Triggers cash collection creation in backend
```

Changes needed:
- Replace `mockProducts` / `fetchSalesProducts()` with `useProducts()`
- Add cashier/location selector (or auto-detect from current user + bakery context)
- Wire "Enregistrer la vente" to API (create run + items + validate)
- Remove the "brouillon" disclaimer text

---

## Phase 2 — Cash Collections (Employee-Centric Period View) ✅ Complete

### Design Principle: Collect by Employee, Across a Period

Cash collections don't happen in isolation per day — they're part of an **ongoing balance with each employee**. A manager wants to:
1. Pick an employee — **livreur** (delivery agent) or **caissier/caissière** (POS cashier)
2. See **all their collections for a payroll period** — what's owed, what's been collected, what remains
3. Record payments against specific days (cash + card + mobile breakdown)
4. Drill down into the delivery/POS sales detail for any given day
5. See how the outstanding balance will affect payroll/commissions

This is fundamentally an **employee-centric view**, not a date-centric list.

Commission and payroll settlement require flexible **period** grouping and a payroll-facing **settled** flag. Commission computation is based on the employee's assigned products and their per-product commission rates.

### Page: `/cash/collections`
**File:** `app/(app)/cash/collections/page.tsx` (rewrite)

#### Target Flow
```
1. Page loads → shows employee selector + period selector
2. Manager picks an employee (or sees list of all employees with balances)
3. Manager sees that employee's collections across the selected period
4. Manager records payment for a specific collection line
5. Manager can drill down to see the delivery/sales detail for that day
6. Period summary shows total expected, collected, and outstanding balance
```

#### Layout

**Top Bar: Employee + Period Selection**
```
┌──────────────────────────────────────────────────────────────────────┐
│  Encaissements                                                       │
│  Collecte de caisse par employé                                      │
│                                                                      │
│  Employé  [Ali K. (Livreur) ▼]     Période  [01/02 – 15/02  ▼]     │
│                                               [Personnalisée...]     │
└──────────────────────────────────────────────────────────────────────┘
```

- **Employee selector**: Select with all employees (delivery agents + cashiers)
  - Shows role badge next to name: "Livreur" or "Caissier (Boutique)"
  - Cashier = POS collections
- **Period selector**: Preset options + custom range
  - "Cette semaine", "Ce mois", "Derniers 15 jours", "Personnalisée..."
  - Flexible — not locked to calendar months (matches real payroll flexibility)

**Summary Cards (for selected employee + period)**
```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Attendu        │ │ Collecté       │ │ Solde restant  │ │ Performance    │
│ 245 000 FCFA   │ │ 228 500 FCFA   │ │ -16 500 FCFA   │ │ 93.3%          │
│ 12 tournées    │ │ 10 réglées     │ │ 2 en attente   │ │ Taux encaissem.│
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

**Collections Table (one row per day, for this employee)**
```
┌──────────────────────────────────────────────────────────────────────┐
│  Collectes · Ali K. · 01/02 – 15/02                                  │
│                                                                      │
│  Date     Source     Attendu    Collecté   Écart    Statut   Actions │
│  ────────────────────────────────────────────────────────────────────│
│  15/02   Livraison   34 500       —         —      En att.  [Saisir]│
│  14/02   Livraison   28 000    28 000        0     Validé   [Voir]  │
│  13/02   Livraison   22 750    22 000     -750     Soumis   [Revoir]│
│  12/02   Livraison   18 500    18 500        0     Validé   [Voir]  │
│  11/02      —           —         —         —      Absent     —     │
│  10/02   Livraison   31 000    30 500     -500     Validé   [Voir]  │
│  ...                                                                 │
│  ────────────────────────────────────────────────────────────────────│
│  Total               245 000   228 500  -16 500                      │
│                                                                      │
│  [Marquer la période comme réglée]                                   │
└──────────────────────────────────────────────────────────────────────┘
```

Key behaviors:
- **One row per day** in the period for this employee
- **Source column**: "Livraison" (delivery agent) or "Boutique" (POS cashier)
- **Days with no delivery** show as "Absent" or "Pas de tournée" (greyed out)
- **Écart** highlighted in red if negative, green if zero
- **Actions**:
  - "Saisir" → inline expand or RecordPaymentPanel to enter amounts
  - "Voir" → read-only detail of validated collection
  - "Revoir" → review submitted collection (validate/reject)
- **"Marquer comme réglée"** → settles the period for payroll

**Inline Collection Recording (expand row or side panel)**

When manager clicks "Saisir" on a pending collection (e.g. Ali K.'s delivery from 15/02):
```
┌──────────────────────────────────────────────────────────────────────┐
│  ▼ 15/02 · Livraison · Attendu: 144 500 FCFA                       │
│                                                                      │
│  Détail de la tournée:        (link back to delivery)               │
│  ┌────────────────────────────────────────────────┐                  │
│  │ Pain Kilo       100 confiés · 12 retour · 88 vendus · 132 000  │
│  │ Pain Moyen       50 confiés ·  0 retour · 50 vendus ·  12 500  │
│  │ Total attendu: 144 500 FCFA                                     │
│  │                                        [Voir tournée complète →]│
│  └────────────────────────────────────────────────┘                  │
│                                                                      │
│  Encaissement:                                                       │
│  Espèces           [         130 000]                                │
│  Carte             [          10 000]                                │
│  Mobile Money      [           3 000]                                │
│  ─────────────────────────────────────                               │
│  Total collecté            143 000 FCFA                              │
│  Écart                      -1 500 FCFA (remainder = solde restant)  │
│                                                                      │
│  Notes  [                                    ]                       │
│                                                                      │
│  [Enregistrer]  [Enregistrer et soumettre]                           │
└──────────────────────────────────────────────────────────────────────┘
```

Key behaviors:
- **Delivery detail summary** shown inline — real products (Pain Kilo, Pain Moyen…), quantities, revenue
- **"Voir tournée complète →"** links to `/sales/deliveries?date=2026-02-15` (opens that day's delivery page)
- **For POS/caissier**: same layout but shows "Ventes boutique" detail instead of "Tournée"
- **Payment inputs**: cash + card + mobile with auto-total (mirrors how cash is actually handed over)
- **Écart** = remainder = outstanding balance: total collecté − attendu
- **Remainder feeds into payroll**: negative = shortage deducted from commission; positive = overpayment (commission itself is computed from per-product rates for the employee's assigned products)

**Validate/Reject Flow**

When manager clicks "Revoir" on a submitted collection:
```
┌──────────────────────────────────────────────────────────────────────┐
│  ▼ 13/02 · Livraison · Attendu: 22 750 · Collecté: 22 000          │
│  Écart: -750 FCFA                                                    │
│  Notes: "Monnaie manquante sur dernière livraison"                  │
│                                                                      │
│  [Voir tournée complète →]                                           │
│                                                                      │
│  [Rejeter ...]  [Valider]                                            │
│                                                                      │
│  (Rejeter expands: reason textarea + confirm)                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Page: `/cash/reconciliations` (All-Employees Overview)
**File:** `app/(app)/cash/reconciliations/page.tsx`

This page becomes the **birds-eye view** across all employees — the manager's starting point to see who has outstanding balances.

#### Target Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│  Suivi des encaissements                                             │
│  Vue d'ensemble par employé                                          │
│                                                                      │
│  Période  [01/02 – 15/02 ▼]        Filtre  [Tous ▼] [Non réglés ▼] │
│                                                                      │
│  Employé       Rôle      Tournées  Attendu    Collecté   Solde      │
│  ────────────────────────────────────────────────────────────────────│
│  Ali K.        Livreur      12     245 000    228 500  -16 500  ⚠   │
│  Amina D.      Livreur      10     180 000    180 000        0  ✓   │
│  Moussa T.     Livreur      11     198 000    195 500   -2 500  ⚠   │
│  Marie C.      Caissière     8     320 000    318 200   -1 800  ⚠   │
│  ────────────────────────────────────────────────────────────────────│
│  Total                      41     943 000    922 200  -20 800      │
│                                                                      │
│  Click any row → navigates to /cash/collections?employee=ali&period= │
└──────────────────────────────────────────────────────────────────────┘
```

Key behaviors:
- **One row per employee** with period totals
- **Solde** column highlighted: red if negative, green if zero
- **Click row** → navigates to `/cash/collections` with employee + period pre-selected
- **Filtre**: "Tous", "Non réglés seulement", "Livreurs", "Caissiers"
- This is the page a manager opens to answer: *"Who owes money this period?"*

---

## Phase 3 — Delivery↔Collection Link ✅ Complete

Backend auto-creates collection on delivery validation. UI shows toast with link.

### In `/sales/deliveries`
When user clicks "Valider la tournée" and it succeeds:
```
Toast: "Tournée validée — collecte de 144 500 FCFA créée automatiquement"
       [Voir la collecte →]  (link to /cash/collections?date=...)
```

### In `/cash/collections`
Collection rows show **source** column:
- "Livraison" (auto-created from delivery run) — with link to delivery
- "Boutique" (auto-created from POS transaction) — with link to POS
- "Manuel" (manually created) — no link

### Schema change ✅
`deliveryRunId` FK added to `cashCollections` table (migration 0007). The collection list API joins to show the source.

---

## Phase 4 — Dashboard ❌ Pending (P1)

### Page: `/dashboard`
**File:** `app/(app)/dashboard/page.tsx` (248 lines)

Replace hardcoded `stats`, `recentActivity`, `alerts` with real API data.

#### Stats Cards (keep same layout, wire to API)

All monetary values in FCFA. Revenue = sum of (sold × unitPrice) across all validated deliveries today.

```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Ventes du jour │ │ Livraisons     │ │ Collectes      │ │ Solde restant  │
│ 847 500 FCFA   │ │ 3 tournées     │ │ 1/3 réglées    │ │ 4 500 FCFA     │
│ +12% vs hier   │ │ 2 validées     │ │ 843 000 coll.  │ │ 2 employés     │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

API: New endpoint `GET /api/v1/dashboard/summary?date=...` returning:
- `todayRevenue` — sum of revenue (sold × unitPrice) from all validated deliveries today, in FCFA
- `deliveryCount` — number of runs today (livreurs + caissiers), how many validated
- `collectionStatus` — settled vs pending, total collected in FCFA
- `outstandingBalance` — total remainder across unsettled collections (feeds into payroll)

#### Quick Actions (keep, already link to correct pages)
```
[Nouvelle livraison → /sales/deliveries]
[Collecte caisse → /cash/collections]
[Ajuster stock → /inventory/adjustments]
```

#### Recent Activity (wire to real data)
Source: last N delivery validations + collection recordings from audit log or recent queries.

#### Alerts (wire to real data)
- Low stock → from inventory API (e.g. "Stock de farine T65 faible", "Plus de levure")
- Pending collections → from collections API (e.g. "3 collectes livreurs en attente")
- High return rate → from deliveries API (e.g. "Ali K.: 15% retour Pain Kilo — supérieur au seuil")
- Outstanding balances → from collections API (e.g. "Moussa T.: -12 500 FCFA non réglé")

---

## Sidebar Navigation Changes

Current sidebar is already well-structured. Minor clarifications:

| Current Link | Maps to | Change Needed |
|---|---|---|
| Ventes > Livraisons | Agent deliveries | None — keep as-is |
| Ventes > Vente boutique | POS sales | Wire to API |
| Collectes > Encaissements | Cash collections | Add create/edit forms |
| Collectes > Historique | Collection history | Wire filters |

No new pages needed. All features fit within existing routes.

---

## Component Reuse Plan

| New UI Element | Built From |
|---|---|
| DateNavigation (◀ date ▶ + calendar) | Button + DatePicker (small inline component) |
| PeriodSelector (preset + custom range) | Select + DatePicker range |
| EmployeeSelector (with role badge) | Select + useEmployees + Badge |
| RecordPaymentPanel (inline expand) | Card + Input (numeric) + Button |
| DeliveryDetailSummary (inline in collection) | Card + Table (read-only, compact) |
| Product selector dropdown | Select + useProducts (same as category selector) |

No new primitive components needed — everything composes from existing library.

---

## Implementation Order (matching EXPECTATIONS.md build plan)

```
✅ Step 1: /sales/deliveries rewrite — DONE
✅ Step 2: Schema patch (deliveryRunId, isSettled, period) — DONE
✅ Step 3: Backend — auto-create collection on delivery validation — DONE
✅ Step 4: /cash/collections rewrite (employee-centric period view) — DONE
✅ Step 5: /cash/reconciliations (all-employees overview) — DONE

❌ Step 6: /sales/transactions — wire POS to API (next P0 task)
        - Replace mock products
        - Create delivery run on "Enregistrer"
        Files: app/(app)/sales/transactions/page.tsx

❌ Step 7: /dashboard — wire to real data (P1)
        - New backend endpoint for dashboard summary
        - Replace hardcoded stats
        Files: app/(app)/dashboard/page.tsx,
               gerpain_backend/src/domains/dashboard/routes.ts
```
