# Business Operations: Deliveries & Cash Collections

This document explains the two core operations of the Gerpain ERP — **Deliveries** and **Cash Collections** — in plain language, using standard ERP concepts.

### ERP Concepts Used

| Gerpain term | Standard ERP concept |
|---|---|
| Bread type (Pain Kilo, Pain Moyen…) | **Product** (with a unit price) |
| Delivery guy (Livreur) | **Sales agent** / field representative |
| Shop / Boutique | **Point of sale (POS)** |
| Store | **Warehouse / Location** (holds inventory, employees, and operations) |
| Outgoing quantities | **Outbound shipment** (goods leaving the warehouse) |
| Returned quantities | **Sales return** (unsold goods coming back) |
| Revenue | **Accounts receivable** (what is owed from the sale) |
| Cash collection | **Payment receipt** / cash settlement |
| Remainder | **Outstanding balance** (receivable minus payment) |
| Commission | **Sales commission** (percentage or per-unit fee on sold products) |
| Payslip | **Payroll entry** |

The goal is simple:
- **Record outbound shipments and returns** so you always know what was sold.
- **Record payments received** so you always know what is still owed.

---

## Table of Contents

1. [Deliveries (Outbound Shipments & Returns)](#1-deliveries)
   - [Business Context](#11-business-context)
   - [How It Works](#12-how-it-works)
   - [User Stories](#13-user-stories)
2. [Cash Collections (Payment Receipts)](#2-cash-collections)
   - [Business Context](#21-business-context)
   - [How It Works](#22-how-it-works)
   - [User Stories](#23-user-stories)
3. [How They Connect](#3-how-they-connect)

---

## 1. Deliveries

### 1.1 Business Context

Products leave the warehouse through two **sales channels**:

1. **Sales agents** — Employees who take products out, sell them in the field, and bring back what they didn't sell.
2. **Point of sale (POS)** — Products are sold directly at the physical store location.

For each day, the system records:
- **Outbound quantity** — how many units of each product left the warehouse (can be split into morning and night batches)
- **Returned quantity** — how many units came back unsold
- **Sold quantity** — outbound minus returned (calculated automatically)
- **Expected revenue** — sold quantity × product unit price (calculated automatically)

### 1.2 How It Works

The deliveries page has two tabs, one per sales channel:

#### A) Sales Agent Deliveries

Each sales agent has a **unit price** (the price of the product they deliver). This is used to calculate their expected revenue and commission.

1. **Select the date** you are recording for.

2. **Record outbound quantities per agent.**
The person responsible for outgoing shipments records how many units each agent took — morning batch and/or night batch.

3. **Record returned quantities per agent.**
When agents come back, a different person records how many units came back unsold. Having two different people handle outbound vs. returns creates a **separation of duties** for accountability.

4. **Add notes** to explain anything unusual (damaged goods, special circumstances).

5. **Save.**
The system instantly shows per agent:
- total outbound
- total returned
- return percentage
- total sold
- expected revenue

#### B) Point-of-Sale Deliveries

Products sold at the POS are tracked **per product type** (e.g., Product A, Product B, Product C), each with its own unit price.

1. **Select the date.**

2. **Record outbound and returned quantities per product.**

3. **Save.**
The system shows totals across all product types.

### 1.3 User Stories

#### Sales Agent
- *As a sales agent, I want to see the products and quantities assigned to me before I leave.*
- *As a sales agent, I want to record returned quantities when I come back so the system knows what I sold.*
- *As a sales agent, I want to flag returned items as damaged or expired so they are handled correctly.*
- *As a sales agent, I want the cash I hand over to be linked to my delivery for clear accountability.*

#### Location Manager
- *As a manager, I want to assign products to sales agents for the day. They will earn a commission and/or salary based on what they sell.*
- *As a manager, I want to create delivery records with a product list so each agent knows what to take.*
- *As a manager, I want to view all deliveries for my location, filtered by date.*
- *As a manager, I want to review returns and investigate unusually high return rates.*
- *As a manager, I want to see performance metrics: outbound vs. returned vs. sold, and revenue per agent.*
- *As an outbound manager, I want to record outgoing quantities (morning and night).*
- *As a returns manager, I want to record returned quantities when agents come back.*

#### Accountant / Finance
- *As an accountant, I want to reconcile expected revenue against cash received to make sure all money is accounted for.*
- *As an accountant, I want reports broken down by sales agent and product for financial analysis.*

#### Chain Owner / Administrator
- *As an admin, I want to see delivery performance across all locations to spot top and underperforming agents.*
- *As an admin, I want to view revenue trends over time.*
- *As an admin, I want full permissions to perform any action available to the roles above.*

---

## 2. Cash Collections

### 2.1 Business Context

When products are sold — whether by a sales agent in the field or at the point of sale — cash (or other payment) needs to come back to the business.

The cash collection process answers one question:

> **"Given what was sold, how much should we receive, how much did we actually receive, and what is the outstanding balance?"**

This is also the bridge to **payroll**: outstanding balances (remainders) are factored into commission and salary calculations at the end of the month.

### 2.2 How It Works

The cash collections page has two tabs, matching the two sales channels:

#### A) Sales Agent Collections

1. **Select the sales agent** you want to review.

2. **Review expected amounts.**
For each delivery day, the system shows the expected revenue (auto-calculated from what was sold).

3. **Record the payment received.**
When the agent hands over cash, you enter the actual amount.

4. **Review the outstanding balance.**
The system shows the difference:
- A negative balance means money is still owed.
- A positive balance means an overpayment.

5. **Save.**

If delivery data is corrected later (e.g., returns were updated), you can **recalculate** to refresh all balances.

#### B) Point-of-Sale Collections

1. **Review expected amounts** per day (broken down by product type).

2. **Record the payment received.**

3. **Save.**

#### Settling for Payroll

Once collections are reviewed and accurate, a manager can **mark them as paid**. This signals that the amounts have been settled and can be used for payroll/commission calculation.

### 2.3 User Stories

#### POS Cashier
- *As a cashier, I want to see my expected cash amount so I know what I should have at the end of my shift.*
- *As a cashier, I want my collection to be recorded by a manager when I hand over the cash.*
- *As a cashier, I want to view my collection history and any outstanding balances.*

#### Sales Agent
- *As a sales agent, I want the cash I hand over to be linked to my delivery.*
- *As a sales agent, I want my expected amount to be auto-calculated from what I sold (outbound minus returned).*
- *As a sales agent, I want to see my collection history and any outstanding balances that affect my commission or salary.*

#### Location Manager
- *As a manager, I want to record the actual cash received from sales agents and cashiers.*
- *As a manager, I want to see all unsettled collections at my location.*
- *As a manager, I want to see the total outstanding balance per employee.*
- *As a manager, I want to recalculate balances if delivery data was corrected.*
- *As a manager, I want to mark collections as paid when settling payroll.*

#### Chain Owner / Administrator
- *As an admin, I want to see collection status across all locations.*
- *As an admin, I want to see outstanding balances by employee over time.*
- *As an admin, I want to edit any collection record to correct errors.*
- *As an admin, I want to filter collection history by paid/unpaid status.*

#### Accountant / Finance
- *As an accountant, I want revenue reports broken down by sales agent and product.*
- *As an accountant, I want to see how outstanding balances affect employee payslips.*
- *As an accountant, I want to export collection data for audit.*

---

## 3. How They Connect

Deliveries and cash collections are two sides of the same transaction:

- **Deliveries** = what was sold (and therefore what is owed)
- **Cash collections** = what was paid (and therefore what remains)

### The daily cycle

1. Products leave the warehouse (outbound shipment)
2. Unsold products come back (sales return)
3. The system calculates what was sold and the expected revenue
4. Cash is handed over and recorded (payment receipt)
5. The system shows the outstanding balance

### Summary

| | Deliveries | Cash Collections |
|---|---|---|
| **ERP concept** | Outbound shipment + sales return | Payment receipt |
| **What you record** | Quantities out + quantities returned | Cash received |
| **What the system calculates** | Quantities sold + expected revenue | Outstanding balance |
| **Why it matters** | Know what was sold, track agent performance | Know what is owed, settle payroll/commissions |

---

## What This Makes Easier

- **End-of-day clarity** — Instantly see what went out, what came back, what should be paid, and what was actually paid.

- **Separation of duties** — Outbound and returns are recorded by different roles, reducing the risk of errors or fraud.

- **Payroll integration** — Outstanding balances feed directly into commission and salary calculations.

- **Multi-location visibility** — Admins can see all of this across every location from a single dashboard.
