# Delivery Board UX – Problem Summary

## 1. Context

Gerpain ERP manages daily deliveries from bakeries to clients (shops, resellers, etc.).
The **delivery board** is meant to be the *single place* where a manager can:

- Configure and review **what is sent out** per delivery guy and per product.
- Capture **what comes back** (returns) per delivery guy and per product.
- Derive **what is sold** and the associated money to collect.

The board must work **per day and per location**, with several delivery staff and many products.


## 2. Business requirements (simplified)

For each **delivery guy** and **day/location**, the system must track at least:

- **Quantité confiée** (given out, all periods combined)
- **Total confié** (monetary value of what was entrusted)
- **Quantité retour** (unsold quantity that came back)
- **% Retour** (Quantité retour / Quantité confiée)
- **Quantité vendue** (Quantité confiée − Quantité retour)
- **Montant vendu** (revenue owed for that run)

At the same time, the admin/manager must be able to see and edit these numbers **per product** for each delivery guy, not only as a total per person.

On top of this, there is an optional notion of **selling period** (morning / afternoon / night) per line, mainly for analytics.


## 3. UX tension / open problem

There is a tension between two needs:

1. **Manager overview**
   - Needs a **simple, high-level view** of the day:
     - Who is delivering today?
     - For each delivery guy, how much was entrusted, how much came back, how much was sold (in quantity and in money)?
   - This calls for a **compact summary** per delivery guy.

2. **Detailed control per product**
   - Needs to **enter and adjust data per product** for each delivery guy:
     - Quantities per product (possibly per selling period)
     - Returns per product
   - Needs to **see how each product behaves** across delivery guys (e.g. which products have high return rates on certain routes).
   - This calls for a **richer, line-by-line view** (delivery guy × product).

The challenge is to design a **single, understandable interface** that:

- Does not overwhelm the user with a huge matrix of inputs.
- Still makes it easy to:
  - Enter quantities per delivery guy × product.
  - See clear per-delivery-guy and per-product **KPIs** (the 6 stats above).
- Fits the mental model of bakery and distribution operations ("je t'ai confié X, tu as rendu Y, tu me dois Z").

So far, attempts either:

- Focus too much on **data entry** (big grid, hard to read for a manager), or
- Focus too much on **summary KPIs** (nice for managers, but hides the detailed per-product numbers needed for control and corrections).

We need a design that reconciles both.


## 4. Constraints and considerations

- **ERP spirit**: navigation and screens should feel like a serious business tool, not a consumer app.
- **Daily use**: the screen will be used every day, often under time pressure (morning preparation, evening reconciliation).
- **Multi-location**: managers may switch between bakeries/locations.
- **Evolving analytics needs**: later, the same data will feed reports (per product, per period, per route, per delivery guy).
- **Potential hardware constraints**: some users may be on laptops with limited resolution or on modest office PCs.


## 5. Types of professionals who should co-design this

To find the best way to design this delivery board, a **multi-disciplinary workshop** would help. Relevant profiles include:

- **Product Designer / UX Designer (B2B / ERP focus)**
  - Specialised in complex, data-heavy business tools.
  - Can design information architecture, screen layouts, and interaction patterns that balance overview and detail.

- **Service Designer / Operations Designer**
  - Focused on the **end-to-end workflow** (from production to delivery to cash collection).
  - Helps map real-life steps (who does what, when, with which information) and align the screen with those steps.

- **Product Manager or Business Analyst (Retail / Distribution / ERP)**
  - Can translate bakery / distribution requirements into precise use cases.
  - Prioritises which scenarios the board must optimise for (morning prep vs evening reconciliation vs audits).

- **Bakery Operations Manager / Field Manager (domain expert)**
  - Someone who actually manages deliveries in a bakery network.
  - Provides real-world constraints: typical number of delivery guys, number of products, common mistakes, time pressure, etc.

- **Data / Analytics Specialist (optional)**
  - Ensures that the captured data structure supports future KPIs and reports.
  - Helps define which aggregations matter most (by product, route, period, customer segment).

- **Senior Frontend Engineer with experience in complex tables/forms**
  - Can evaluate feasibility and performance of different UI patterns (large tables, virtualised lists, inline editing, drill-downs, etc.).
  - Helps ensure the final design remains implementable and maintainable in the chosen stack (Next.js, React, etc.).


## 6. Expected outcomes of a workshop

Such a group could collaborate to define:

- A **clear hierarchy of views** (e.g. daily summary per delivery guy, drill-down per product, separate analytical reports).
- One or two **canonical screen layouts** for the delivery board that:
  - Make data entry fast and reliable.
  - Give managers immediate visibility on the 6 key stats per delivery guy.
  - Allow easy inspection of per-product performance when needed.
- A refined **data model** (deliveries, delivery lines, periods) that matches both UX needs and reporting needs.

This brief is intended as a starting point for those professionals to quickly understand the problem and co-design an appropriate solution.


## 7. Proposed UX/UI Solution

### 7.1 Design Philosophy

To reconcile the tension between **manager overview** and **detailed control**, we propose a **two-phase interface design**:

1. **Summary View (Default)**: Gives managers a quick, high-level overview of all delivery personnel with key performance indicators
2. **Detail View (Drill-down)**: Allows detailed data entry and editing per delivery person and per product

This approach ensures that:
- Managers can **scan the day's operations at a glance** without being overwhelmed
- Staff can **enter and adjust detailed data** when needed without losing context
- The interface **matches the actual workflow** (morning prep → evening reconciliation)

### 7.2 Phase 1: Summary View (Manager Overview)

**Purpose**: Primary landing view that answers "How is the day going?" for all delivery personnel.

**Layout**:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Tableau des livraisons – [Date Selector] [Location: Active Store]  │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────┐
│  Livreur              │ Confié │ Prix   │ Retour │ %Ret │ Vendu │ Montant dû   │
├────────────────────────────────────────────────────────────────────────────────┤
│  Ali – Centre-ville   │  200   │ 45,000 │   15   │  7%  │  185  │ 41,625 FCFA │
│  [Details] button     │        │        │        │      │       │              │
├────────────────────────────────────────────────────────────────────────────────┤
│  Amina – Bureaux      │  150   │ 33,750 │    8   │  5%  │  142  │ 31,950 FCFA │
│  [Details] button     │        │        │        │      │       │              │
├────────────────────────────────────────────────────────────────────────────────┤
│  Moussa – Résidentiel │  180   │ 40,500 │   22   │ 12%  │  158  │ 35,550 FCFA │
│  [Details] button     │        │        │        │      │       │              │
├────────────────────────────────────────────────────────────────────────────────┤
│  TOTAL JOURNÉE        │  530   │119,250 │   45   │  8%  │  485  │109,125 FCFA │
└────────────────────────────────────────────────────────────────────────────────┘

Status indicators: ⚪ Draft  |  🟡 In Progress  |  🟢 Validated
```

**Key Features**:
- **One row per delivery person**: Shows their name and route at a glance
- **6 critical KPIs per person**:
  - **Quantité confiée**: Total quantity given out (all products combined)
  - **Total confié**: Monetary value of entrusted goods
  - **Quantité retour**: Total quantity returned (unsold)
  - **% Retour**: Return rate (Retour / Confié)
  - **Quantité vendue**: Sold quantity (Confié - Retour)
  - **Montant vendu/dû**: Revenue owed for that delivery run
- **Aggregated totals**: Bottom row shows daily totals across all delivery personnel
- **Visual status indicators**: Quick visual cue for run status (draft, validated, closed)
- **"Details" action**: Click to drill down into per-product view for that person

**Workflow Support**:
- **Morning check**: Manager can see who has been assigned goods and expected values
- **Evening review**: Quick scan of return rates and revenues across all personnel
- **Anomaly detection**: High return percentages stand out immediately

### 7.3 Phase 2: Detail View (Per-Employee Drill-Down)

**Purpose**: Data entry and editing interface for detailed per-product quantities.

**Trigger**: Clicking "Details" button or row in summary view opens this view (as modal, slide-out panel, or separate page).

**Layout**:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Summary                                                  │
│                                                                      │
│  Ali – Tournée centre-ville                                         │
│  Date: 24 Nov 2024  |  Location: Boulangerie Centre                │
│  Status: 🟡 In Progress  [Change Status ▼]                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│ Produit          │ Confié │ Prix unit. │ Retour │ Vendu │ Période    │ Total    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Baguette 500g    │  [80]  │  225 FCFA  │  [5]   │  75   │ [Matin ▼]  │ 18,000   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Baguette 750g    │  [60]  │  300 FCFA  │  [3]   │  57   │ [Soir ▼]   │ 17,100   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Pain kilo        │  [40]  │  450 FCFA  │  [5]   │  35   │ [Matin ▼]  │ 15,750   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Croissant        │  [20]  │  150 FCFA  │  [2]   │  18   │ [Matin ▼]  │  2,700   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ [+ Add Product]                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘

Totals:  Confié: 200  |  Retour: 15 (7%)  |  Vendu: 185  |  Revenue: 41,625 FCFA

Notes: ________________________________________________

[Save Draft]  [Validate & Close]  [Cancel]
```

**Key Features**:
- **Employee context**: Header shows who this run is for, date, location, current status
- **Per-product lines**: Each product gets its own row with editable fields
- **Editable quantities**:
  - **Quantité confiée** (given out): Entered in morning
  - **Quantité retour** (returned): Entered in evening
  - **Unit price**: Pre-filled from product master, can be adjusted if needed
- **Computed fields**:
  - **Quantité vendue**: Auto-calculated as (Confié - Retour)
  - **Total ligne**: Auto-calculated as (Vendu × Prix unitaire)
- **Selling period dropdown**: Optional field for analytics (Matin / Après-midi / Soir / Non précisé)
- **Live aggregates**: Footer shows real-time totals as user types
- **Status transitions**: Can move from Draft → In Progress → Validated → Closed
- **Notes field**: Free text for special circumstances or issues

**Workflow Support**:
- **Morning preparation** (8:00 AM):
  - Staff opens detail view for each delivery person
  - Enters "Quantité confiée" for each product being loaded
  - Saves as "Draft" or marks "In Progress"
  
- **Evening reconciliation** (18:00 PM):
  - Staff reopens same delivery run
  - Enters "Quantité retour" for each product that came back
  - System auto-calculates sold quantities and revenue
  - Validates the run (status → "Validated")

- **Manager review**:
  - Can drill into detail view to spot-check specific product performance
  - Can make corrections if needed before final validation

### 7.4 Data Model Supporting the UI

To support both views, the underlying data structure tracks:

**Per Delivery Run (one per employee per day)**:
- Employee ID
- Delivery date
- Location ID
- Status (draft / in-progress / validated / closed)

**Per Delivery Item (one per product per run)**:
- Product ID
- Quantity delivered (confié)
- Quantity returned (retour)
- Unit price
- Selling period (optional)
- **Computed**: Quantity sold = delivered - returned
- **Computed**: Line total = quantity sold × unit price

**Aggregations for Summary View**:
- Sum of all quantities delivered → Total confié (qty)
- Sum of all line totals → Total confié (price)
- Sum of all quantities returned → Total retour
- Return percentage = (total retour / total confié) × 100
- Total sold = total confié - total retour
- Total revenue = sum of all line totals

### 7.5 Responsive Behavior

**Desktop/Laptop (>1024px)**:
- Summary view: Full table with all 6 KPI columns visible
- Detail view: Modal or slide-out panel overlaying summary

**Tablet (768px - 1024px)**:
- Summary view: Horizontal scroll for table, or card-based layout with key metrics
- Detail view: Full-screen overlay

**Mobile (<768px)**:
- Summary view: Vertical card stack, one card per employee showing key metrics
- Detail view: Full-screen page with simplified product entry

### 7.6 Visual Design Principles

- **Color-coding for status**:
  - Draft: Gray/neutral
  - In Progress: Yellow/amber
  - Validated: Green
  - High return rate (>15%): Red highlight
  
- **Typography hierarchy**:
  - Employee names: Bold, larger
  - Route labels: Smaller, muted color
  - Numbers: Tabular figures for alignment
  - KPIs: Medium weight for emphasis

- **Whitespace and density**:
  - Summary view: Compact but scannable (managers need to see many rows at once)
  - Detail view: More breathing room for data entry (reduce errors)

- **Interactive affordances**:
  - Hover states on rows to indicate clickability
  - Clear "editable field" styling vs "computed field" styling
  - Validation feedback (e.g., return quantity can't exceed delivered quantity)

### 7.7 Key Advantages of This Approach

1. **Addresses the UX tension directly**:
   - Summary view = manager overview (simple, high-level)
   - Detail view = product control (rich, detailed)

2. **Matches real-world workflow**:
   - Morning: Quick entry of what went out
   - Evening: Quick entry of what came back
   - Continuous: Manager can check status anytime

3. **Scales well**:
   - Works with 3 delivery people or 30
   - Works with 5 products or 50 (detail view scrolls, summary stays compact)

4. **Reduces cognitive load**:
   - Managers don't see overwhelming grids of inputs
   - Entry staff focus on one delivery person at a time

5. **Supports future enhancements**:
   - Can add product-level analytics filters on summary view
   - Can add bulk operations (copy yesterday's quantities, etc.)
   - Can integrate with collection/cash reconciliation workflows

### 7.8 Open Questions for Validation

Before implementation, stakeholders should confirm:

1. **Detail view presentation**: Modal overlay, slide-out panel, or separate page?
2. **Default state on page load**: Show all runs as collapsed in summary, or auto-expand first incomplete run?
3. **Editing permissions**: Can anyone edit any run, or only assigned personnel/managers?
4. **Historical access**: How many days back should be accessible? Archive older runs?
5. **Printing/export**: Does summary view need to be printable for end-of-day reports?
6. **Selling period granularity**: Are 3 periods (Matin/Après-midi/Soir) sufficient, or do some locations need more?
7. **Multi-location view**: Should managers with multiple locations see aggregated summary across all locations, or always scoped to one location at a time?
