# Gerpain Improvements Backlog

This document consolidates all improvement opportunities identified from:
1. Analysis of `rebuild_gerpain/` specifications vs current implementation
2. Vercel React Best Practices review
3. Performance and architecture audits

---

## A. Backend Performance (Critical)

### 1. SQL-Level Filtering in Collections Overview
**File:** `gerpain_backend/src/domains/collections/routes.ts:28-64`

**Problem:** Fetches ALL collections for organization, then filters in JavaScript. Causes N+1 queries and transfers unnecessary data.

**Current Code Pattern:**
```typescript
const allCollections = await db.select().from(cashCollections).where(eq(cashCollections.organizationId, organizationId));
let filtered = allCollections;
if (bakeryId) filtered = filtered.filter(c => c.bakeryId === bakeryId);
if (startDate) filtered = filtered.filter(c => c.date >= startDate);
```

**Fix:** Push all filters to SQL WHERE clause using Drizzle's `and()`, `gte()`, `lte()`:
```typescript
const conditions = [eq(cashCollections.organizationId, orgId)];
if (bakeryId) conditions.push(eq(cashCollections.bakeryId, bakeryId));
if (startDate) conditions.push(gte(cashCollections.date, startDate));
if (endDate) conditions.push(lte(cashCollections.date, endDate));

const collections = await db
  .select()
  .from(cashCollections)
  .where(and(...conditions));
```

**Impact:** Reduces data transfer 10-100x, eliminates memory pressure.
**Effort:** 20 minutes

---

### 2. Parallelize Independent Queries
**File:** `gerpain_backend/src/domains/collections/routes.ts:52-58`

**Problem:** Sequential await for collections, then employees:
```typescript
const allCollections = await db.select()... // Wait
const allEmployees = await db.select()...   // Wait again
```

**Fix:** Use Promise.all():
```typescript
const [collections, employees] = await Promise.all([
  db.select().from(cashCollections).where(...),
  db.select().from(employees).where(...)
]);
```

**Impact:** ~40% faster endpoint response.
**Effort:** 5 minutes

---

### 3. Batch Delivery Run Creation
**File:** `gerpain_backend/src/domains/deliveries/routes.ts:73-100`

**Problem:** Sequential per-employee queries inside for-loop:
```typescript
for (const employee of deliveryEmployees) {
  const assignedProducts = await db.select()... // Query per employee
  const [firstLocation] = await db.select()...  // Query per employee
  // ... create run
}
```

**Fix:** Batch fetch all employee products and locations upfront:
```typescript
// One query for all assignments
const allAssignments = await db
  .select()
  .from(employeeProducts)
  .where(inArray(employeeProducts.employeeId, employeeIds));

// One query for locations
const locations = await db
  .select()
  .from(locationsTable)
  .where(...)
  .limit(1);

// Then build runs in memory
```

**Impact:** Reduces 10+ queries to 2-3 queries.
**Effort:** 30 minutes

---

### 4. Add Database Indexes
**File:** New migration file

**Missing indexes (critical for performance at scale):**
```sql
-- Most frequent query: delivery runs by org/bakery/date
CREATE INDEX idx_delivery_runs_org_bakery_date 
ON delivery_runs(organization_id, bakery_id, date);

-- Cash collections filtering
CREATE INDEX idx_cash_collections_employee_date 
ON cash_collections(employee_id, date);

CREATE INDEX idx_cash_collections_org_status 
ON cash_collections(organization_id, status);

-- Employee lookups
CREATE INDEX idx_employees_org_bakery_role_status 
ON employees(organization_id, bakery_id, role, status) 
WHERE status = 'active';
```

**Impact:** Query performance 10-100x at scale.
**Effort:** 30 minutes

---

## B. Data Model Improvements

### 5. Temporal Commission Rates
**Rationale:** From `rebuild_gerpain/DATABASE_DESIGN.md:242-262`

**Current:** `employee_products.commissionPerUnit` has no date range. When rates change, history is lost.

**Add to `employee_products`:**
```typescript
effectiveFrom: date('effective_from').notNull().defaultNow(),
effectiveTo: date('effective_to'), // null = currently active
```

**Query pattern for active rate:**
```typescript
.where(and(
  eq(employeeProducts.employeeId, employeeId),
  lte(employeeProducts.effectiveFrom, deliveryDate),
  or(
    isNull(employeeProducts.effectiveTo),
    gte(employeeProducts.effectiveTo, deliveryDate)
  )
))
```

**Impact:** Supports payroll audit and rate changes without breaking historical calculations.
**Effort:** 2 hours
**Priority:** P2

---

### 6. Cash Variance Tracking
**Rationale:** From `rebuild_gerpain/DATABASE_DESIGN.md:647-659`

**Current:** Only stores `variance` as integer. No categorization of WHY variance occurred.

**Add to `cashCollections` (minimal fix):**
```typescript
varianceReason: text('variance_reason'), // "shortage", "overage", "damaged"
varianceResolution: text('variance_resolution'), // "employee_liable", "business_loss"
varianceExplainedBy: uuid('variance_explained_by').references(() => users.id),
varianceExplainedAt: timestamp('variance_explained_at'),
```

**Or create full `cash_variances` table (comprehensive fix):**
```sql
CREATE TABLE cash_variances (
  id UUID PRIMARY KEY,
  cash_collection_id UUID REFERENCES cash_collections(id),
  variance_type VARCHAR(20) CHECK (variance_type IN ('shortage', 'overage', 'damaged_money', 'counterfeit')),
  amount INTEGER NOT NULL,
  explanation TEXT,
  resolution VARCHAR(20),
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Impact:** Audit compliance, better operational insights.
**Effort:** 1-3 hours depending on approach
**Priority:** P2

---

### 7. Separate Collector vs Employee
**Rationale:** From `rebuild_gerpain/DATABASE_DESIGN.md:614`

**Current:** Only `employeeId` (who submitted cash). Missing `collectorId` (who received it).

**Add to `cashCollections`:**
```typescript
collectorId: uuid('collector_id').references(() => employees.id),
```

**Impact:** Accountability separation - the person handing over cash ≠ person receiving it.
**Effort:** 30 minutes
**Priority:** Medium

---

### 8. Delivery Timing Fields
**Rationale:** From `rebuild_gerpain/DATABASE_DESIGN.md:539-540`

**Add to `delivery_runs`:**
```typescript
departureTime: timestamp('departure_time'), // When agent left
returnTime: timestamp('return_time'),       // When agent returned
```

**Use case:** Track efficiency (route duration), correlate with returns.
**Effort:** 30 minutes
**Priority:** Low

---

## C. Frontend Performance (Vercel Best Practices)

### 9. Backend Aggregates
**File:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx:319-354`, `gerpain_backend/src/domains/deliveries/routes.ts`

**Problem:** `computeRunAggregates()` runs on every render. With 20 agents × 50 items = 1,000+ iterations per render.

**Fix - Backend:**
Add aggregates to API response:
```typescript
// In backend route
const runsWithAggregates = runs.map(run => ({
  ...run,
  aggregates: {
    quantityEntrusted: run.items.reduce((s, i) => s + i.quantityEntrusted, 0),
    quantityReturned: run.items.reduce((s, i) => s + i.quantityReturned, 0),
    revenue: run.items.reduce((s, i) => s + (i.quantityEntrusted - i.quantityReturned) * i.unitPrice, 0),
    returnRate: run.items.length > 0 ? ... : 0
  }
}));
```

**Then frontend:** Remove all `computeRunAggregates` calls, use `run.aggregates` directly.

**Impact:** Eliminates O(n²) work on every render.
**Effort:** 30 minutes
**Priority:** CRITICAL

---

### 10. Memoize Expensive Grouping
**File:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx:589-601`

**Problem:** `reduce()` to group items by product runs on every keystroke.

**Current:**
```typescript
// Inside render, re-runs constantly
const itemsByProduct = displayItems.reduce((acc, item) => {
  // ... grouping
}, {});
```

**Fix:**
```typescript
const itemsByProduct = useMemo(() => {
  return displayItems.reduce((acc, item) => {
    // ... grouping
  }, {});
}, [displayItems]);
```

**Impact:** Eliminates wasted work during typing.
**Effort:** 10 minutes
**Priority:** High

---

### 11. Memoize Table Rows
**File:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx:440-498`

**Problem:** `runs.map()` creates new component instances on every render.

**Fix:**
```typescript
const DeliveryRow = memo(function DeliveryRow({ run, onSelect }) {
  // Row render logic
});

// In parent:
runs.map(run => <DeliveryRow key={run.id} run={run} onSelect={setSelectedRunId} />)
```

**Impact:** React skips re-rendering unchanged rows.
**Effort:** 20 minutes
**Priority:** Medium

---

### 12. Stable Callbacks
**File:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx:222-234`

**Problem:** `handleLocalQuantityChange` recreated every render, causing input re-mounts.

**Fix:**
```typescript
const handleLocalQuantityChange = useCallback((itemId, field, value) => {
  setEditedItems(prev => ({
    ...prev,
    [itemId]: { ...prev[itemId], [field]: Math.max(0, value) }
  }));
}, []); // Empty deps = stable
```

**Impact:** Inputs don't lose focus, better typing experience.
**Effort:** 15 minutes
**Priority:** Medium

---

### 13. Use Transitions for Non-Urgent Updates
**File:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx:312-317`

**Problem:** `handleValidateRun` blocks UI during async work.

**Fix:**
```typescript
const [isPending, startTransition] = useTransition();

async function handleValidateRun(runId: string) {
  startTransition(async () => {
    if (isDirty) await handleSave(runId);
    await validateDeliveryRun.mutateAsync(runId);
  });
}

// Show pending state
<Button disabled={isPending}>
  {isPending ? 'Validation...' : 'Valider'}
</Button>
```

**Impact:** UI stays responsive during validation.
**Effort:** 15 minutes
**Priority:** Medium

---

### 14. Dynamic Imports for Heavy Components
**File:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx`

**Problem:** Delivery detail panel loads even when collapsed.

**Fix:**
```typescript
import dynamic from 'next/dynamic';

const DeliveryDetailPanel = dynamic(
  () => import('@/components/deliveries/DeliveryDetailPanel'),
  { 
    ssr: false,
    loading: () => <Skeleton rows={5} />
  }
);
```

**Impact:** Initial bundle size reduced.
**Effort:** 30 minutes
**Priority:** Medium

---

### 15. Prefetch on Hover
**File:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx:210-220`

**Problem:** No anticipation of user navigation.

**Fix:**
```typescript
function handleNextDay() {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  
  // Prefetch BEFORE navigation
  queryClient.prefetchQuery({
    queryKey: deliveryKeys.runs({ date: formatDate(nextDate) }),
    queryFn: () => getDeliveryRuns({ date: formatDate(nextDate) }),
  });
  
  setDate(formatDate(nextDate));
}
```

**Impact:** Perceived performance - data loads instantly when date changes.
**Effort:** 15 minutes
**Priority:** Medium

---

## D. UX Improvements

### 16. High Return Rate Visual Alert
**File:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx:469-472`

**Current:** Basic styling at 10% threshold.

**Requirement from DELIVERY_BOARD_UX_BRIEF:** Red highlight at >15% return rate.

**Fix:**
```typescript
<span className={aggregates.returnRate > 0.15 
  ? "font-medium text-[var(--error)] bg-[var(--error)]/10 px-2 py-1 rounded" 
  : aggregates.returnRate > 0.10 
    ? "font-medium text-[var(--warning)]"
    : "text-[var(--muted-foreground)]"
}>
  {formatReturnRate(aggregates.returnRate)}
</span>
```

**Impact:** Better visual alert for anomalies.
**Effort:** 10 minutes
**Priority:** High

---

### 17. Validation: Return ≤ Entrusted
**File:** `nextjs_frontend/app/(app)/sales/deliveries/page.tsx:715-728`

**Requirement from DELIVERY_BOARD_UX_BRIEF:** Return quantity cannot exceed entrusted quantity.

**Fix:**
```typescript
// Add validation in handleLocalQuantityChange
if (field === 'quantityReturned' && value > entrusted) {
  notify({ variant: 'error', title: 'Erreur', description: 'Retour ne peut excéder confié' });
  return;
}

// Add visual indicator
<input 
  className={cn(
    "h-8 w-20 rounded...",
    returned > entrusted && "border-[var(--error)] ring-1 ring-[var(--error)]"
  )}
/>
```

**Impact:** Prevents data entry errors.
**Effort:** 30 minutes
**Priority:** High

---

### 18. Copy Yesterday's Quantities
**Rationale:** From DELIVERY_BOARD_UX_BRIEF - high-value daily operation improvement.

**Feature:** Button to pre-fill today's entrusted quantities from yesterday's validated run.

**Implementation sketch:**
```typescript
// New API endpoint: GET /api/v1/deliveries/runs?date=2024-01-14&employeeId=xxx
// Then copy quantities to new run

async function handleCopyYesterday() {
  const yesterday = subDays(new Date(date), 1);
  const yesterdayRuns = await getDeliveryRuns({ 
    date: formatDate(yesterday),
    employeeId: selectedRun.employeeId 
  });
  
  if (yesterdayRuns[0]?.status === 'validated') {
    // Pre-fill today's items with yesterday's quantities
    for (const item of yesterdayRuns[0].items) {
      await createDeliveryItem.mutateAsync({
        runId: selectedRun.id,
        data: { productId: item.productId, quantityEntrusted: item.quantityEntrusted, ... }
      });
    }
  }
}
```

**Impact:** Saves data entry time for agents with consistent daily quantities.
**Effort:** 2 hours
**Priority:** Medium

---

## E. Workflow Improvements

### 19. Expanded Delivery Status
**Current:** `draft` | `validated`

**Proposed:** `draft` | `in_progress` | `validated` | `closed`

- `in_progress`: Entrusted recorded, waiting for returns (morning → evening workflow)
- `closed`: Fully reconciled (optional P2)

**Impact:** Better workflow state tracking.
**Effort:** 1 hour
**Priority:** P2

---

### 20. Stock Auto-Deduction
**Rationale:** Close loop between deliveries and inventory.

**On delivery validation:**
1. Deduct `quantityEntrusted - quantityReturned` from location inventory
2. Credit returned items back to stock

**Implementation:**
```typescript
// In validateDeliveryRun transaction
await db.transaction(async (trx) => {
  // Update delivery status
  await trx.update(deliveryRuns).set({ status: 'validated' }).where(...);
  
  // Update inventory
  for (const item of run.items) {
    const sold = item.quantityEntrusted - item.quantityReturned;
    await trx.update(inventoryItems)
      .set({ 
        currentQuantity: sql`${inventoryItems.currentQuantity} - ${sold}` 
      })
      .where(eq(inventoryItems.productId, item.productId));
    
    // Record transaction
    await trx.insert(inventoryTransactions).values({
      itemId: item.productId,
      type: 'sale',
      quantity: sold,
      referenceType: 'delivery_run',
      referenceId: run.id
    });
  }
});
```

**Impact:** Real-time inventory tracking.
**Effort:** 3 hours
**Priority:** P2

---

### 21. Audit Trail Writes
**Current:** `auditLogs` table exists but nothing writes to it.

**Critical events to log:**
- Delivery validation
- Cash collection recording
- Settlement marking
- Inventory adjustments

**Implementation:**
```typescript
// Middleware or service
async function auditLog({
  tableName,
  recordId,
  action,
  oldValues,
  newValues,
  userId
}) {
  await db.insert(auditLogs).values({
    tableName,
    recordId,
    action,
    oldValues: JSON.stringify(oldValues),
    newValues: JSON.stringify(newValues),
    userId,
    timestamp: new Date()
  });
}
```

**Impact:** Compliance, debugging, accountability.
**Effort:** 2 hours
**Priority:** P2

---

## Priority Summary

### P0 - Implement Now (Quick Wins)
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | SQL-level filtering | 20m | Critical |
| 2 | Parallel queries | 5m | High |
| 9 | Backend aggregates | 30m | Massive |
| 10 | Memoize grouping | 10m | High |
| 16 | Return rate alert | 10m | Medium |
| 4 | Database indexes | 30m | Critical |

### P1 - Next Sprint
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 3 | Batch delivery creation | 30m | High |
| 11 | Memo table rows | 20m | Medium |
| 12 | Stable callbacks | 15m | Medium |
| 17 | Return validation | 30m | High |
| 7 | Collector ID | 30m | Medium |

### P2 - Future
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 5 | Temporal commission | 2h | Medium |
| 6 | Variance tracking | 1-3h | Medium |
| 18 | Copy yesterday | 2h | Medium |
| 19 | Status expansion | 1h | Low |
| 20 | Stock deduction | 3h | High |
| 21 | Audit logging | 2h | Medium |

---

## Verification Checklist

Before marking any improvement as complete:

- [ ] **Performance fixes:** Measure before/after with React DevTools Profiler
- [ ] **Backend fixes:** Add EXPLAIN ANALYZE for query plans
- [ ] **Frontend fixes:** Verify no re-renders with Why Did You Render
- [ ] **Data model changes:** Create migration, test rollback
- [ ] **UX changes:** Verify with pilot users if possible

---

*Last updated: 2026-02-08*
