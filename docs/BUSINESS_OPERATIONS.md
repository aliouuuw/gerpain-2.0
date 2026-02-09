# Business Operations: Deliveries & Cash Collections

This document explains the two core operational pillars of the Gerpain bakery ERP — **Deliveries** and **Cash Collections** — based on the actual implementation in the codebase (Gerpain 2.0).

---

## Table of Contents

1. [Deliveries](#1-deliveries)
   - [Business Context](#11-business-context)
   - [Implementation Details](#12-implementation-details)
   - [User Stories](#13-user-stories-deliveries)
2. [Cash Collections](#2-cash-collections)
   - [Business Context](#21-business-context)
   - [Implementation Details](#22-implementation-details)
   - [User Stories](#23-user-stories-cash-collections)
3. [How Deliveries and Cash Collections Connect](#3-how-deliveries-and-cash-collections-connect)

---

## 1. Deliveries

### 1.1 Business Context

Bakeries distribute products (bread, viennoiseries, drinks, etc.) through two channels:
1. **Sales Agents (Livreurs)** — Staff who take products out on vehicles and sell to customers in the field
2. **Point of Sale (Boutique)** — Direct retail sales from the physical store by cashiers (Caissiers)

The system tracks what goes out (entrusted), what comes back unsold (returns), and calculates revenue from the difference. All monetary values are in **FCFA (XOF)**.

### 1.2 Implementation Details

#### Unified Delivery Model

Both sales channels use a single **delivery run** model. The employee's `role` field (`delivery` or `cashier`) distinguishes the channel.

**Delivery Run** — one record per employee per date:
```typescript
// delivery_runs table (Drizzle/PostgreSQL):
- id: UUID
- organizationId: UUID        // Multi-tenancy
- bakeryId: UUID              // Which bakery
- employeeId: UUID            // The agent (role: delivery or cashier)
- locationId: UUID            // Warehouse or shop
- date: DATE                  // Delivery date
- status: TEXT                // "draft" | "validated"
- validatedAt: TIMESTAMP     // When validated (locks the run)
- notes: TEXT
```

**Delivery Items** — one record per product per period within a run:
```typescript
// delivery_items table:
- id: UUID
- runId: UUID                 // FK to delivery_runs
- productId: UUID             // FK to products (Pain Kilo, Pain Moyen, etc.)
- period: TEXT                // "Matin" | "Soir" (morning/night batch)
- quantityEntrusted: INTEGER  // Units sent out
- quantityReturned: INTEGER   // Units returned unsold
- unitPrice: INTEGER          // Price snapshot in FCFA at time of delivery
```

#### Pre-populated Daily Form

Deliveries happen **daily with the same agents and products**. The system auto-creates draft runs:

1. When the page loads for a date, the backend checks if delivery runs exist for all active delivery employees
2. If not, it **auto-creates draft runs** for each active delivery employee
3. Each run is pre-populated with the employee's **assigned products** (from `employee_products` table) at qty 0
4. The manager sees a **ready-to-fill form** — just enter quantities and save

#### Employee Product Assignments

Each delivery/cashier employee has assigned products with per-product commission rates:

```typescript
// employee_products table:
- employeeId: UUID
- productId: UUID
- commissionPerUnit: INTEGER  // FCFA per unit sold
- isActive: BOOLEAN
```

This drives:
- Which products appear in an agent's daily delivery form
- Commission computation: `sum(sold × commissionPerUnit)` for assigned products

#### Data Flow

1. **Manager** opens deliveries page for a date → all agents are pre-populated
2. **Manager** enters quantities entrusted per product per period (Matin/Soir)
3. **Manager** enters quantities returned (ideally a different person for accountability)
4. System calculates per item:
   - **Sold** = quantityEntrusted − quantityReturned
   - **Revenue** = Sold × unitPrice (in FCFA)
5. System shows per-run totals: total entrusted, returned, return rate %, sold, revenue
6. Manager clicks **"Enregistrer"** (save as draft) or **"Valider"** (lock + auto-create cash collection)

#### Key Database Models (Drizzle ORM)

```typescript
// gerpain_backend/src/shared/database/schema.ts

export const deliveryRuns = pgTable("delivery_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  bakeryId: uuid("bakery_id").notNull().references(() => bakeries.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  locationId: uuid("location_id").references(() => locations.id),
  date: date("date").notNull(),
  status: text("status").default("draft").notNull(),
  validatedAt: timestamp("validated_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deliveryItems = pgTable("delivery_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull().references(() => deliveryRuns.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  period: text("period").default("Matin").notNull(),
  quantityEntrusted: integer("quantity_entrusted").default(0).notNull(),
  quantityReturned: integer("quantity_returned").default(0).notNull(),
  unitPrice: integer("unit_price").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### UI Components

- `/sales/deliveries` page — Main deliveries page with date navigation (◀/▶ + calendar)
- Summary table: all agents for the selected date with totals (entrusted, returned, %return, sold, revenue)
- Detail view: per-product breakdown with Matin/Soir quantity inputs
- Save as draft / Validate buttons

#### Permission Model (P2 — planned)

- **OUT_MANAGER**: Can edit entrusted quantities (morning/night), cannot edit returns
- **IN_MANAGER**: Can edit returned quantities, cannot edit entrusted
- This creates a separation of duties for accountability

### 1.3 User Stories (Deliveries)

#### Sales Agent (Livreur)
- *As a sales agent, I want to view the list of products and quantities loaded onto my vehicle before I depart.*
- *As a sales agent, I want to record returned quantities for each product when I come back so the system knows what I actually sold.*
- *As a sales agent, I want to flag items as damaged or expired during returns so they are not restocked.*
- *As a sales agent, I want to hand over the cash I collected and have it linked to my delivery so my accountability is clear.*

#### Location Manager
- *As a manager, I want to open the deliveries page and see all my agents pre-populated for today — no manual setup needed.*
- *As a manager, I want to assign products to agents with per-product commission rates (FCFA/unit).*
- *As a manager, I want to record quantities entrusted and returned per product per period (Matin/Soir).*
- *As a manager, I want to view all deliveries for my location with their statuses (tracked by date).*
- *As a manager, I want to review delivery returns and investigate large return quantities.*
- *As a manager, I want to see delivery performance metrics (items delivered vs. returned, revenue per agent) to optimize operations.*
- *As a manager, I want to validate a delivery run to lock it and trigger cash collection creation.*

#### Accountant / Finance
- *As an accountant, I want to reconcile delivery revenue against cash collected to ensure all money is accounted for.*
- *As an accountant, I want delivery reports broken down by agent and product for financial analysis.*

#### Chain Owner / Administrator
- *As an admin, I want to see delivery performance across all locations to identify top-performing and underperforming agents.*
- *As an admin, I want to view delivery revenue trends over time to inform strategic decisions.*
- *As an admin, I want to have total permission to handle any of the user types above.*

---

## 2. Cash Collections

### 2.1 Business Context

Cash enters the business from two sources:
1. **Agent sales** — cash collected by delivery agents on their routes
2. **POS sales** — cash collected by cashiers at the physical store

The Cash Collection system tracks:
- **Expected** (`expectedAmount`): What should have been collected (auto-calculated from validated deliveries)
- **Actual** (`actualAmount`): What was actually handed over (cash + card + mobile breakdown)
- **Variance** (`variance`): The difference (actualAmount − expectedAmount). Negative = shortage, positive = overpayment
- **Settlement status** (`isSettled`): Whether the collection has been settled for payroll

### 2.2 Implementation Details

#### Data Model (Drizzle ORM)

```typescript
// gerpain_backend/src/shared/database/schema.ts

export const cashCollections = pgTable("cash_collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  bakeryId: uuid("bakery_id").references(() => bakeries.id),
  employeeId: uuid("employee_id").references(() => employees.id),
  locationId: uuid("location_id").references(() => locations.id),
  deliveryRunId: uuid("delivery_run_id").references(() => deliveryRuns.id),  // Links to source delivery
  date: date("date"),
  expectedAmount: integer("expected_amount").default(0),     // From delivery validation
  actualAmount: integer("actual_amount").default(0),         // Total collected
  cashAmount: integer("cash_amount").default(0),             // Cash portion
  cardAmount: integer("card_amount").default(0),             // Card portion
  mobileAmount: integer("mobile_amount").default(0),         // Mobile Money portion
  variance: integer("variance").default(0),                  // actual − expected
  status: text("status").default("pending"),                 // pending | submitted | validated | rejected
  isSettled: boolean("is_settled").default(false),           // Payroll settlement flag
  period: text("period"),                                    // Flexible period label (e.g. "Jan-2026")
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### Cash Collection Flow

1. **Auto-creation on delivery validation**: When a delivery run is validated, a `cashCollection` is auto-created with:
   - `expectedAmount` = sum of ((quantityEntrusted − quantityReturned) × unitPrice) for all items
   - `deliveryRunId` = the source delivery run
   - `employeeId`, `locationId`, `date` from the run
   - `status` = "pending"

2. **Employee-centric period view**: The collections page is organized by employee across a payroll period:
   - Manager picks an employee (Livreur or Caissier) and a period (week, month, custom range)
   - Sees all their collections for that period with summary cards
   - Records actual cash received with cash + card + mobile breakdown
   - System calculates variance per collection and period totals

3. **Validation workflow**:
   - Manager records payment → status becomes "submitted"
   - Manager validates or rejects (with reason)
   - Validated collections feed into payroll

4. **Payroll settlement**: "Marquer la période comme réglée" sets `isSettled = true` for all collections in the period, signaling they can be used for payroll/commission calculation.

#### UI Components

- `/cash/collections` — Employee-centric period view with:
  - Employee selector (with role badge: Livreur / Caissier)
  - Period selector (Cette semaine, Ce mois, Derniers 15 jours, Personnalisée)
  - Summary cards: Attendu, Collecté, Solde restant, Performance %
  - Collections table: one row per day, with inline payment recording
  - Delivery detail summary per collection row
  - Validate/reject workflow
- `/cash/reconciliations` — All-employees overview:
  - Period selector + role/settled filters
  - One row per employee with period totals (Attendu, Collecté, Solde)
  - Click row → drills into employee detail view

#### API Endpoints

```typescript
// Backend: gerpain_backend/src/domains/collections/routes.ts

GET  /cash-collections              // List with filters (employeeId, startDate, endDate, status)
GET  /cash-collections/aggregates   // Summary totals for selected employee + period
GET  /cash-collections/overview     // Per-employee aggregates (birds-eye view)
POST /cash-collections              // Create manually
PUT  /cash-collections/:id          // Update (record payment, validate, reject)
POST /cash-collections/settle       // Mark period as settled for payroll
```

### 2.3 User Stories (Cash Collections)

#### Cashier / Shop Staff
- *As a cashier, I want to see my expected cash amount at the end of my shift so I know what I should have.*
- *As a cashier, I want to have my cash collection recorded by a manager when I hand over the cash.*
- *As a cashier, I want to view my collection history and any outstanding balances.*

#### Sales Agent (Livreur)
- *As a sales agent, I want to submit the cash I collected on my route, linked to my delivery transaction.*
- *As a sales agent, I want my expected amount to be auto-calculated from my delivery sales (entrusted − returned).*
- *As a sales agent, I want to see my collection history and any outstanding balances that affect my commission/salary.*

#### Location Manager
- *As a manager, I want to select an employee and see all their collections for a payroll period.*
- *As a manager, I want to record the actual cash collected (cash + card + mobile breakdown).*
- *As a manager, I want to see all unsettled collections at my location so I know who hasn't handed over cash yet.*
- *As a manager, I want to see the total variance (shortage/overage) for each employee.*
- *As a manager, I want to validate or reject submitted collections.*
- *As a manager, I want to mark a period as settled when ready for payroll.*

#### Chain Owner / Administrator
- *As an admin, I want to see cash collection status across all employees in a single overview.*
- *As an admin, I want to see a summary of balances (shortages/overages) by employee over time.*
- *As an admin, I want to edit any collection record to correct errors.*
- *As an admin, I want to view collection history and filter by settled/unsettled status.*

#### Accountant / Finance
- *As an accountant, I want delivery revenue reports broken down by agent and product type.*
- *As an accountant, I want to see the impact of balances on employee payslips.*
- *As an accountant, I want to export cash collection data for external audit.*

---

## 3. How Deliveries and Cash Collections Connect

```
DELIVERY FLOW (Gerpain 2.0)
============================

Manager records entrusted:         Manager records returned:
- Per product (Pain Kilo, etc.)    - Per product
- Per period (Matin / Soir)        - Notes (damage, etc.)

        ↓                                   ↓
        └───────────────┬───────────────────┘
                        ↓
             System calculates per item:
             - Sold = entrusted − returned
             - Revenue = sold × unitPrice (FCFA)
                        ↓
        ┌───────────────────────────────────┐
        │  delivery_run (status: draft)      │
        │  ─────────────────────────────────│
        │  + delivery_items[] per product    │
        │    quantityEntrusted, Returned     │
        │    unitPrice (snapshot)            │
        └───────────────┬───────────────────┘
                        ↓  [Valider la tournée]
        ┌───────────────────────────────────┐
        │  delivery_run (status: validated)  │
        │  validatedAt = now()               │
        └───────────────┬───────────────────┘
                        ↓  auto-creates
        ┌───────────────────────────────────┐
        │  cash_collection (auto-created)    │
        │  ─────────────────────────────────│
        │  expectedAmount = Σ(sold×price)    │
        │  deliveryRunId = run.id            │
        │  status = "pending"                │
        │  isSettled = false                 │
        └───────────────┬───────────────────┘
                        ↓
MANAGER records payment:            PAYROLL INTEGRATION
- cashAmount (espèces)                     ↓
- cardAmount (carte)               ┌────────────────────┐
- mobileAmount (mobile money)      │ Commission =       │
                                   │ Σ(sold × commRate) │
        ↓                          │ for assigned prods  │
variance = actual − expected       │                    │
                                   │ netSalary =        │
If delivery corrected:             │ baseSalary         │
re-validate → updates expected     │ + commission       │
                                   │ − outstanding bal. │
                                   └────────────────────┘
```

### Summary Table

| Aspect | Deliveries | Cash Collections |
|---|---|---|
| **Primary actor** | Manager fills in quantities / Agent views | Manager records cash handover |
| **Data captured** | quantityEntrusted, quantityReturned per product per period | actualAmount (cash + card + mobile), variance |
| **Calculation** | revenue = (entrusted − returned) × unitPrice | variance = actualAmount − expectedAmount |
| **Link to payroll** | Agents earn per-product commission on sold quantities | Outstanding balance adjusts net salary |
| **Settlement** | N/A | `isSettled` flag marks period as settled for payroll |
| **Period tracking** | N/A | Flexible periods (week, biweekly, month, custom) |

---

## Files Reference

### Delivery-related files:
- `gerpain_backend/src/domains/deliveries/routes.ts` — API routes (CRUD + validate)
- `nextjs_frontend/app/(app)/sales/deliveries/page.tsx` — Deliveries page
- `nextjs_frontend/lib/api/deliveryRuns.ts` — API client
- `nextjs_frontend/lib/hooks/useDeliveries.ts` — React Query hooks

### Cash Collection-related files:
- `gerpain_backend/src/domains/collections/routes.ts` — API routes (CRUD + aggregates + settle + overview)
- `nextjs_frontend/app/(app)/cash/collections/page.tsx` — Employee-centric collection recording
- `nextjs_frontend/app/(app)/cash/reconciliations/page.tsx` — All-employees overview
- `nextjs_frontend/lib/api/collections.ts` — API client
- `nextjs_frontend/lib/hooks/useCollections.ts` — React Query hooks

### Database:
- `gerpain_backend/src/shared/database/schema.ts` — Drizzle ORM schema: deliveryRuns, deliveryItems, cashCollections, employees, employeeProducts, products, locations, bakeries, organizations

---

*This document reflects the actual implementation as of Gerpain 2.0 (Feb 2026). For database schema details, see `gerpain_backend/src/shared/database/schema.ts`.*
