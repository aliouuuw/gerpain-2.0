# MVP Scope – Deliveries, Collections, Employees & Compensation

This document refines the MVP scope of the Gerpain ERP around the **core operations that matter most today**:

- Deliveries of goods (bread, pastries, etc.) by delivery employees
- Cash collections and reconciliation for those deliveries
- Employee management and **commission-based compensation**
- Multi-bakery / multi-location operations

It is intentionally focused on the flows needed for a **pilotable, production-grade MVP**, leaving UI niceties (e.g. full in-store daily sales capture) for a later phase.

---

## 1. Core Actors

- **Delivery Guy (Livreur)**  
  - Receives goods (bread, pastries, beverages…) from a shop or production site.  
  - Delivers to boutiques, resellers, street points, etc.  
  - Collects cash or records credit from customers.  
  - May be paid **fully or partially via commissions** on delivered goods.

- **Cashier / Shop Staff**  
  - Hands over goods to delivery guys at the start of a period (morning/night).  
  - Records quantities given out and quantities returned.  
  - May process some direct sales (not in MVP scope for now).

- **Location Manager**  
  - Oversees one or several shops/locations.  
  - Validates delivery runs, returns, and cash collections.  
  - Tracks outstanding balances per delivery employee.

- **Admin / Chain Owner / Accountant**  
  - Defines compensation structures (salary, commission rates).  
  - Manages payroll periods and final deductions.  
  - Reviews reports across all locations.

- **Driver / Vehicle Owner** (if separate from delivery guy)  
  - Drives the vehicle used by one or more delivery guys.  
  - Can be treated as a regular employee with its own compensation rules.

---

## 2. Core Entities & Relationships (Conceptual)

This section summarizes the **conceptual data model**. The relational schema is defined in detail in `DATABASE_DESIGN.md`.

### 2.1 Products & Goods

- **Product**  
  - Example: *Pain kilo*, *Baguette*, *Croissant*, beverages.  
  - Key attributes: `name`, `category` (bread, pastry, beverage), `unit` (piece, tray, kg), `basePrice`, `isCommissionEligible`.

- **Inventory / Stock at Location**  
  - How much of each product is available at a given location.  
  - Feeds **delivery assignments** and (later) **in-store sales**.

### 2.2 Employees & Assignments

- **Employee**  
  - Supports multiple roles: delivery, cashier, manager, driver, etc.  
  - Can be attached to **multiple locations** and **one or more bakery chains** (multi-bakery scenario).

- **Employee Role & Compensation Structure**  
  - For each employee, we must be able to define:
    - Base salary (optional for pure commission roles)  
    - Commission structure (percentage or fixed per unit)  
    - Commission-eligible products (all goods, or only some types)  
    - Effective dates per compensation structure  
  - This maps to the **HR domain** tables in `DATABASE_DESIGN.md` (employees, employee_roles, compensation_structures, payroll_items, employee_adjustments).

- **Long-term delivery assignments (no per-day date)**  
  - Represent **who normally delivers what, from where**, over weeks or months:
    - Employee ↔ default location(s) / route(s)
    - Default product portfolio (bread, pastries, etc.) for that delivery role
    - Commission settings for those products / that zone
  - These assignments **do not require selecting a specific date** every time. They change only when the organization or portfolio changes.
  - At runtime, the UI can use these assignments to pre-populate per-day delivery runs (see section 3.1).

### 2.3 Delivery Operations

- **Selling period (optional analysis dimension)**  
  - Business wants to understand **when** products sell best (e.g. morning / afternoon / night).  
  - Rather than defining the whole board per period, we treat period as an **optional label on each delivered line**.  
  - Example: a 500g baguette may be delivered in morning + night, while a 750g baguette may be afternoon + night.

- **Delivery Run / Transaction**  
  - Core entity that answers: *"What was given to this delivery guy, what was sold, what was returned, and what was collected?"*  
  - Main attributes:
    - `deliveryDate`  
    - `locationId`  
    - `deliveryPersonId` (employee)  
    - Status: `draft`, `submitted`, `validated`, `closed`  
  - Lines (delivery items):
    - **Given out quantities** per product  
    - **Returned quantities** per product  
    - **Sold quantities** (derived as given − returned)  
    - **Unit price** and **line total**  
    - Optional **`sellingPeriod`** field (e.g. morning / afternoon / night) for analysis and per-period reporting  
  - This corresponds conceptually to `delivery_transactions` and `delivery_items` in `DATABASE_DESIGN.md`.

### 2.4 Collections & Balances

- **Expected Amount per Delivery Run**  
  - `expectedAmount = Σ (soldQuantity × unitPrice)` over all items in the run.

- **Collection Event (Cash Collection)**  
  - Represents money collected by a cashier/manager from a delivery guy over one or more delivery runs.  
  - Can be daily, every few days, or at custom periods (matches the **flexible collection periods** in BUSINESS_REQUIREMENTS).  
  - Main attributes:
    - `collectionPeriodStart` / `collectionPeriodEnd`  
    - `deliveryPersonId`  
    - `locationId`  
    - `expectedAmount` for the period (sum of expected amounts of runs in that window)  
    - `actualCollectedAmount`  
    - `variance = actualCollectedAmount − expectedAmount`  
  - This aligns with `cash_collections`, `cash_reconciliations`, and `cash_variances` tables.

- **Outstanding Balance per Delivery Employee**  
  - When `actualCollectedAmount < expectedAmount`, the **remainder** becomes a **balance owed** by the delivery employee.  
  - This balance can remain open across several collection events and multiple days.

---

## 3. Key MVP Workflows

### 3.1 Create Delivery Runs (Daily Multi-Employee View)

Goal: allow entering delivery data for **all delivery guys in one view** for a given day, while the system still stores **one delivery run per employee**, and each product line can optionally carry a selling period label.

1. Manager or cashier opens the **delivery board** for a given context:
   - Location (usually driven by a global location selector in the app shell)  
   - Date (e.g. today)
2. The system loads **all active delivery employees** for that location based on long-term assignments.  
3. The UI presents a **table or board**:
   - One row (or card) **per delivery employee**.  
   - Each row shows the employee and their typical product portfolio (from assignments or last run).  
   - For each employee/product combination, the user can input **quantities given out**, and optionally a **selling period** label per line (morning / afternoon / night).
4. When the user saves:
   - The system creates or updates a separate **delivery run (delivery_transaction)** per employee for that date/location.  
   - All runs share the same `deliveryDate` and `locationId`, but have different `deliveryPersonId`.
5. System can optionally check available stock at the location (soft or hard validation) when confirming quantities.

**Result:** The UI lets you manage a whole day’s deliveries for **all delivery staff in one place**, while the database keeps a clean, per-employee record of what left the shop for that date. Period-of-day analysis is handled via the optional `sellingPeriod` field on each line, not by forcing separate boards.

### 3.2 Record Returns & Delivered Quantities (End of Period)

1. At the end of the period, the same run is opened.  
2. For each product, the user records **returned quantity** (unsold, damaged, etc.).  
3. System derives **sold quantity** per product.  
4. Using **agreed unit prices**, system calculates **line totals** and the **expected amount** for the run.  
5. Manager validates the run → status moves to `validated` or `closed`.

**Result:** We can compute **performance metrics** per delivery guy: delivered volume, returned goods, revenue.

### 3.3 Cash Collection & Reconciliation

1. At the end of a day or collection period, the admin initiates a **cash collection** for a delivery employee.  
2. System aggregates all **validated runs** in the period and computes:
   - `periodExpectedAmount`  
   - `alreadyCollectedAmount` (past collections in the same period)  
   - `outstandingBalanceBefore`  
3. Admin records **actual cash received** now (`currentCollection`).  
4. System computes:
   - `varianceThisCollection = currentCollection − expectedForThisBatch`  
   - `newOutstandingBalance` (if negative variance)  
5. Optionally, a **reconciliation record** is created for audit and later reporting.

**Result:** The system continuously tracks **per-delivery-person balances** and variances, which feed into payroll.

### 3.4 Payroll Integration & Deductions

1. At the end of a **payroll period** (weekly, bi-weekly, monthly):
   - System reads:  
     - Total commissions earned from delivery runs  
     - Outstanding negative balances from collections  
2. Generates **payroll items** per employee:
   - `baseSalary`  
   - `commissionAmount` (from delivery performance)  
   - `deductionAmount` (from unpaid balances)  
3. Optionally creates **employee adjustments** records to track recurring or one-off deductions.

**Result:** Delivery employee pay reflects both **performance (commission)** and **discipline (balances settled or not)**.

---

## 4. Multi-Bakery / Multi-Location Considerations

- An **employee can be attached to multiple locations**:
  - E.g., delivery guy working for different shops or regions on different days.  
  - Need to track per-location performance and balances.

- A **delivery run** is always tied to **one location** (origin of the goods), but an employee can have runs in many locations over a period.

- Compensation structures can be **per chain and optionally per location**:
  - Commission rate might differ between chains or product categories.  
  - Some chains may pay a higher rate on pastries vs bread.

- **Location as a global context in the UI**:  
  - In the frontend app shell, managers/admins with access to multiple locations will typically have a **global location selector** ("workspace" / "team space").  
  - All delivery boards, collections views, and reports are then scoped by the currently selected location by default, with the option to aggregate across locations when needed.

- Reporting must support:
  - Per-employee metrics across all locations.  
  - Per-location and per-chain aggregates.

---

## 5. Out-of-Scope for MVP (But Already Hinted in Docs)

To keep the first version focused and deliverable:

- **Full daily in-store sales capture UI** (POS-style caisse screen) is **not core MVP**.  
  - We already implemented a basic `/sales/transactions` prototype in the frontend, but it is considered a **phase 2 enhancement**.
- **Advanced route optimization and GPS tracking** are outside MVP.  
- **Wholesale and credit terms** remain in the long-term vision but are not in the first implementation slice.

---

## 6. How This Maps to Existing Design Docs

- `BUSINESS_REQUIREMENTS.md`  
  - This doc refines the **Sales & Revenue**, **Cash Management**, and **HR & Payroll** sections for **delivery-focused MVP**.

- `DATABASE_DESIGN.md`  
  - Delivery and collections are primarily backed by:  
    - `delivery_transactions`, `delivery_items`  
    - `cash_collections`, `cash_reconciliations`, `cash_variances`  
    - `employees`, `compensation_structures`, `payroll_periods`, `payroll_items`, `employee_adjustments`

- `API_SPECIFICATION.md`  
  - Delivery-related and cash-management endpoints (`/sales/transactions`, `/deliveries`, `/cash-collections`, `/hr/*`) will be **prioritized** in the MVP implementation order.

This refined scope should guide:

- **Backend slices**: which tables and endpoints to implement first.  
- **Frontend UX flows**: which pages and journeys (assign goods → record runs → collect cash → payroll) should be designed and built before anything else.  
- **Data modeling decisions**: ensuring commission logic, balances, and multi-location work correctly from day one.
