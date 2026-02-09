# Data Migration Guide: Old Gerpain → New Gerpain 2.0

## 1. Schema Comparison

### Entity Mapping (Old → New)

| Old Table | New Table(s) | Transformation |
|-----------|-------------|----------------|
| `Admin` | `users` + `organizations` | Admin becomes a user who owns an organization. `bakeryChain` → `organizations.name`/`slug` |
| `Store` | `bakeries` | Store was the production center; now `bakeries` scoped under an org |
| `Shop` | `locations` (type=`"shop"`) | Shops become locations under a bakery |
| `Employee` | `employees` + `employeeLocations` | Role enum remapped; location is now many-to-many |
| `BreadType` | `products` | Shop-specific bread types become org/bakery-wide products |
| `Delivery` | `deliveryRuns` + `deliveryItems` | Single JSON record split into run header + per-product/period line items |
| `ShopDelivery` + `BreadDelivery` | `deliveryRuns` + `deliveryItems` | Unified into the same delivery system |
| `CashCollection` | `cashCollections` | Similar concept; more granular fields (cash/card/mobile split, variance, status workflow) |
| `StockItem` | `inventoryItems` + `products` | Stock catalog split into product definition + inventory levels per location |
| `StockMovement` | ❌ **Not in new schema yet** | Needs to be added if historical movements matter |
| `Advance` | ❌ **Not in new schema yet** | Payroll advances — must be added for payroll module |
| `Bonus` | ❌ **Not in new schema yet** | Payroll bonuses — must be added for payroll module |
| `PaySlip` | ❌ **Not in new schema yet** | Payslips — must be added for payroll module |
| `_AdvanceToPaySlip` | ❌ **Not in new schema yet** | Junction table for advance↔payslip |
| `_BonusToPaySlip` | ❌ **Not in new schema yet** | Junction table for bonus↔payslip |
| `Session` | `sessions` | Different auth system (Lucia vs magic link) — **not migratable** |
| `MagicLinkToken` | ❌ Dropped | New system uses password-based auth — **not migratable** |

### New Tables (no old equivalent)

| New Table | Purpose |
|-----------|---------|
| `organizations` | Multi-tenancy layer wrapping bakeries |
| `bakeries` | Explicit bakery entity (was implicit via `Store`) |
| `categories` | Product categorization |
| `employeeLocations` | Many-to-many employee↔location assignment |
| `employeeProducts` | Per-product commission per employee |
| `pricingRules` | Location-specific pricing overrides |
| `roles` / `userRoles` | RBAC system |
| `organizationMembers` / `organizationInvitations` | Org membership |
| `oauthAccounts` / `apiKeys` | Auth extensions |
| `auditLogs` / `healthCheckLogs` | Observability |

### Key Structural Differences

1. **IDs**: Old uses `serial` (integer auto-increment) → New uses `uuid`. All FK references change.
2. **Multi-tenancy**: Every domain entity now carries `organizationId` + `bakeryId`.
3. **Delivery model**: Old stored `outgoingBread` as a single JSON `{morning, night}` per delivery. New normalizes into `deliveryItems` rows with `period` (Matin/Après-midi/Soir) and `quantityEntrusted`/`quantityReturned`.
4. **Money**: Old used `double precision` (floats). New uses `integer` (XOF centimes or whole units). Need to decide on rounding during migration.
5. **Role enum**: Old `Role` = `CAISSIER | LIVREUR | OUT_MANAGER | IN_MANAGER | BASIC`. New `employees.role` = `delivery | cashier | manager | baker` (text, not enum).

---

## 2. Migration Priority

### Essential Data (migrate first)
1. **Admin → users + organizations** — foundational for everything else
2. **Store → bakeries** — needed before any domain data
3. **Shop → locations** — needed for deliveries/collections
4. **Employee → employees + employeeLocations** — core operational data
5. **BreadType → products** — needed for delivery items
6. **Delivery / ShopDelivery / BreadDelivery → deliveryRuns + deliveryItems** — core business data
7. **CashCollection → cashCollections** — financial records

### Important but Blocked (need new tables first)
8. **Advance → advances** (table needs to be created)
9. **Bonus → bonuses** (table needs to be created)
10. **PaySlip → paySlips** (table needs to be created)

### Skip
- `Session`, `MagicLinkToken` — auth tokens are ephemeral, not worth migrating
- `_AdvanceToPaySlip`, `_BonusToPaySlip` — migrate alongside payroll tables

---

## 3. Migration Transforms (Step by Step)

### Step 1: Admin → users + organizations

```sql
-- For each Admin, create a user and an organization
-- Old: Admin { id, name, email, bakeryChain, phoneNumber, address, createdAt }
-- New: users { id (uuid), email, name, hashedPassword (null), createdAt }
--      organizations { id (uuid), name=bakeryChain, slug=slugify(bakeryChain), ownerId=new_user_id }

-- ID mapping table (keep for all subsequent steps)
CREATE TEMP TABLE admin_map (old_id INT, new_user_id UUID, new_org_id UUID);
```

**Transform logic:**
- `Admin.email` → `users.email`
- `Admin.name` → `users.name`
- `Admin.bakeryChain` → `organizations.name`, `organizations.slug` (slugified)
- Users will need to set a password on first login (or use a reset flow)

### Step 2: Store → bakeries

```sql
-- Old: Store { id, name, adminId, createdAt }
-- New: bakeries { id (uuid), organizationId, name, code, isActive=true }

CREATE TEMP TABLE store_map (old_id INT, new_bakery_id UUID, new_org_id UUID);
```

**Transform logic:**
- `Store.adminId` → look up `admin_map` to get `organizationId`
- `Store.name` → `bakeries.name`
- Generate a short `code` from the store name (e.g., first 3-4 chars uppercase)

### Step 3: Shop → locations (type="shop")

```sql
-- Old: Shop { id, name, storeId, cashierId, createdAt }
-- New: locations { id (uuid), organizationId, bakeryId, name, type="shop" }

CREATE TEMP TABLE shop_map (old_id INT, new_location_id UUID);
```

**Transform logic:**
- `Shop.storeId` → look up `store_map` to get `bakeryId` and `organizationId`
- `Shop.name` → `locations.name`
- `Shop.cashierId` → create an `employeeLocations` entry after employees are migrated

### Step 4: Employee → employees + employeeLocations

```sql
-- Old: Employee { id, name, email, phoneNumber, address, adminId, role, storeId, shopId, 
--                 salary, unitPrice, commission, isActive, createdAt }
-- New: employees { id (uuid), organizationId, bakeryId, firstName, lastName, email, phone, 
--                  role, status, commissionRate, baseSalary, createdAt }

CREATE TEMP TABLE employee_map (old_id INT, new_employee_id UUID);
```

**Transform logic:**
- Split `Employee.name` → `firstName` + `lastName` (split on first space)
- **Role mapping:**
  - `LIVREUR` → `"delivery"`
  - `CAISSIER` → `"cashier"`
  - `OUT_MANAGER` / `IN_MANAGER` → `"manager"`
  - `BASIC` → `"baker"` (or `"cashier"` depending on context)
- `Employee.storeId` → look up `store_map` to get `bakeryId`
- `Employee.salary` → `baseSalary` (cast `double` → `integer`, round)
- `Employee.commission` → `commissionRate` (if it was a percentage; if it was a flat amount, store as metadata)
- `Employee.isActive` → `status = isActive ? "active" : "inactive"`
- `Employee.shopId` → create `employeeLocations` entry linking to the mapped location
- `Employee.storeId` → also create `employeeLocations` if needed

### Step 5: BreadType → products

```sql
-- Old: BreadType { id, type, unitPrice, shopId }
-- New: products { id (uuid), organizationId, bakeryId, name, unitPrice, isActive=true }

CREATE TEMP TABLE breadtype_map (old_id INT, new_product_id UUID);
```

**Transform logic:**
- `BreadType.type` → `products.name` (e.g., "Pain Kilo", "Pain Moyen")
- `BreadType.unitPrice` (double) → `products.unitPrice` (integer, round)
- `BreadType.shopId` → look up shop → store → bakery to get `bakeryId` and `organizationId`
- **Deduplication**: If multiple shops had the same bread type name, create one product per org/bakery and use `pricingRules` for location-specific prices

### Step 6: Delivery → deliveryRuns + deliveryItems

```sql
-- Old: Delivery { id, date, storeId, employeeId, outgoingBread (JSON), returnedBread, revenue }
-- New: deliveryRuns { id (uuid), organizationId, bakeryId, employeeId, locationId, date, status="validated" }
--      deliveryItems { id (uuid), runId, productId, period, quantityEntrusted, quantityReturned, unitPrice }
```

**Transform logic:**
- Each old `Delivery` → one `deliveryRuns` row
- `Delivery.storeId` → look up `store_map` for `bakeryId`; need a default location (the bakery's primary shop/warehouse)
- `Delivery.employeeId` → look up `employee_map`
- Parse `outgoingBread` JSON: `{morning: N, night: M}`
  - Create 2 `deliveryItems`: one with `period="Matin"`, `quantityEntrusted=morning` and one with `period="Soir"`, `quantityEntrusted=night`
  - `quantityReturned` = split proportionally or assign all to one period
- `unitPrice` → from the employee's associated product (need to determine which product — old model had `Employee.unitPrice`)
- `status` = `"validated"` (historical data is already finalized)

### Step 7: ShopDelivery + BreadDelivery → deliveryRuns + deliveryItems

```sql
-- Old: ShopDelivery { id, date, storeId, shopId, cashierId }
--      BreadDelivery { id, breadTypeId, outgoingBread (JSON), returnedBread, revenue, shopDeliveryId }
-- New: deliveryRuns { ... locationId = shop_map[shopId] }
--      deliveryItems { ... productId = breadtype_map[breadTypeId] }
```

**Transform logic:**
- Each `ShopDelivery` → one `deliveryRuns` row (employee = cashier, location = shop)
- Each `BreadDelivery` → deliveryItems (one per period from JSON)

### Step 8: CashCollection → cashCollections

```sql
-- Old: CashCollection { id, storeId, employeeId, deliveryId, shopDeliveryId, revenue, collectedCash, remainder, month, isPaid }
-- New: cashCollections { id (uuid), organizationId, bakeryId, employeeId, locationId, deliveryRunId, 
--                        date, expectedAmount, actualAmount, cashAmount, variance, status, isSettled, period }
```

**Transform logic:**
- `revenue` → `expectedAmount` (cast to integer)
- `collectedCash` → `actualAmount` and `cashAmount` (assume all cash)
- `remainder` → `variance` (note: sign convention may differ — old was `revenue - collectedCash`, new is `actualAmount - expectedAmount`)
- `isPaid` → `isSettled`
- `month` (YYYY-MM string) → `period` + derive `date` (first of month)
- `deliveryId` or `shopDeliveryId` → look up the corresponding `deliveryRuns` id
- `status` = `"validated"` for historical records

### Step 9: StockItem → products + inventoryItems

```sql
-- Old: StockItem { id, name, category, quantity, unit, reorderPoint, storeId }
-- New: products { ... } (if not already a product)
--      inventoryItems { organizationId, locationId, productId, currentQuantity, reorderPoint }
```

**Transform logic:**
- `StockItem.name` → check if a matching product exists; if not, create one
- `StockItem.category` (`MATIERE_PREMIERE`, `UTILITE`, `CONSOMMABLE`) → create `categories` entries and assign
- `StockItem.quantity` → `inventoryItems.currentQuantity`
- `StockItem.reorderPoint` → `inventoryItems.reorderPoint`

---

## 4. Missing Tables for Payroll Migration

To migrate `Advance`, `Bonus`, and `PaySlip`, you need to add these tables to the new schema:

```typescript
// Suggested additions to schema.ts

export const advances = pgTable("advances", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // FCFA
  reason: text("reason"),
  isRecurring: boolean("is_recurring").default(false),
  recurringMonths: integer("recurring_months").default(0),
  remainingMonths: integer("remaining_months").default(0),
  startPeriod: text("start_period").notNull(), // e.g. "2025-01"
  endPeriod: text("end_period"),
  isProcessed: boolean("is_processed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bonuses = pgTable("bonuses", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // FCFA
  reason: text("reason"),
  isRecurring: boolean("is_recurring").default(false),
  recurringMonths: integer("recurring_months").default(0),
  remainingMonths: integer("remaining_months").default(0),
  startPeriod: text("start_period").notNull(),
  endPeriod: text("end_period"),
  isProcessed: boolean("is_processed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paySlips = pgTable("pay_slips", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // e.g. "2025-01"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  baseSalary: integer("base_salary").notNull(),
  totalCommission: integer("total_commission").notNull(),
  totalAdvances: integer("total_advances").default(0),
  totalBonuses: integer("total_bonuses").default(0),
  totalRemainder: integer("total_remainder").default(0), // from cash collections
  netSalary: integer("net_salary").notNull(),
  isPaid: boolean("is_paid").default(false),
  daysWorked: integer("days_worked").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Junction tables
export const advancePaySlips = pgTable("advance_pay_slips", {
  id: uuid("id").defaultRandom().primaryKey(),
  advanceId: uuid("advance_id").notNull().references(() => advances.id, { onDelete: "cascade" }),
  paySlipId: uuid("pay_slip_id").notNull().references(() => paySlips.id, { onDelete: "cascade" }),
});

export const bonusPaySlips = pgTable("bonus_pay_slips", {
  id: uuid("id").defaultRandom().primaryKey(),
  bonusId: uuid("bonus_id").notNull().references(() => bonuses.id, { onDelete: "cascade" }),
  paySlipId: uuid("pay_slip_id").notNull().references(() => paySlips.id, { onDelete: "cascade" }),
});
```

---

## 5. Recommended Migration Approach

### Option A: SQL Migration Script (recommended for production)

Write a single idempotent SQL script that:
1. Reads from old DB (via `dblink` or foreign data wrapper, or a dump)
2. Inserts into new DB with UUID generation and ID mapping
3. Uses temporary mapping tables to track old_id → new_uuid

**Pros**: Fast, atomic, handles large datasets  
**Cons**: Complex SQL, harder to debug

### Option B: TypeScript Migration Script (recommended for ease)

Write a Bun/TypeScript script that:
1. Connects to both old (Prisma/pg) and new (Drizzle/pg) databases
2. Reads old data in dependency order
3. Transforms and inserts into new DB
4. Maintains ID maps in memory

**Pros**: Easier to write/debug, can handle complex transforms (JSON parsing, name splitting)  
**Cons**: Slower for large datasets, needs both DBs accessible

### Recommended Order of Execution

```
1. Admin     → users + organizations
2. Store     → bakeries
3. Shop      → locations
4. Employee  → employees + employeeLocations
5. BreadType → products (+ categories if needed)
6. Delivery  → deliveryRuns + deliveryItems
7. ShopDelivery + BreadDelivery → deliveryRuns + deliveryItems
8. CashCollection → cashCollections
9. StockItem → inventoryItems (+ products if new)
10. [After adding payroll tables] Advance → advances
11. [After adding payroll tables] Bonus → bonuses
12. [After adding payroll tables] PaySlip → paySlips + junction tables
```

---

## 6. Gotchas & Decisions Needed

| Issue | Decision Needed |
|-------|----------------|
| **Float → Integer** for money | Round or truncate? (e.g., `salary: 150000.5` → `150001` or `150000`) |
| **Employee.name** is a single field | How to split into `firstName`/`lastName`? First space? Last space? |
| **Employee.unitPrice** | This was a per-employee bread price. Map to `employeeProducts.commissionPerUnit`? Or use `pricingRules`? |
| **Delivery.outgoingBread JSON** `{morning, night}` | Map `morning` → period `"Matin"`, `night` → period `"Soir"`. What about `"Après-midi"`? (ignore for old data) |
| **Delivery has no product reference** | Old model assumed one product per delivery guy. Need to determine which `productId` to use (from `Employee.unitPrice` context) |
| **BreadType was per-shop** | Deduplicate across shops into org-level products? Or keep bakery-scoped? |
| **CashCollection.remainder sign** | Old: `remainder = revenue - collectedCash` (positive = shortage). New: `variance = actualAmount - expectedAmount` (negative = shortage). **Signs are flipped.** |
| **StockItem.category enum** | Create matching `categories` rows or map to different names? |
| **Payroll tables missing** | Add `advances`, `bonuses`, `paySlips` tables before migrating that data |
