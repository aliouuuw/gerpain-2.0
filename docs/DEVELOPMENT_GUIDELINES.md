# Gerpain Development Guidelines

Reference document for maintaining code quality, performance, and consistency across the Gerpain codebase. These guidelines should be followed for all future development work.

---

## 1. Performance Principles

### 1.1 Backend: Push Work to the Database

**Rule:** Never filter in JavaScript what can be filtered in SQL.

**Good:**
```typescript
// SQL WHERE clause filters
const runs = await db
  .select()
  .from(deliveryRuns)
  .where(and(
    eq(deliveryRuns.organizationId, orgId),
    eq(deliveryRuns.bakeryId, bakeryId),
    gte(deliveryRuns.date, startDate),
    lte(deliveryRuns.date, endDate)
  ));
```

**Bad:**
```typescript
// Fetch all, filter in JS
const allRuns = await db.select().from(deliveryRuns);
const runs = allRuns.filter(r => 
  r.organizationId === orgId && 
  r.bakeryId === bakeryId &&
  r.date >= startDate
);
```

**Why:** Database indexes + query planner are 10-100x more efficient than JS filtering.

---

### 1.2 Backend: Parallelize Independent Queries

**Rule:** Use `Promise.all()` when queries don't depend on each other.

**Good:**
```typescript
const [collections, employees, products] = await Promise.all([
  db.select().from(cashCollections).where(...),
  db.select().from(employees).where(...),
  db.select().from(products).where(...)
]);
```

**Bad:**
```typescript
const collections = await db.select().from(cashCollections).where(...);
const employees = await db.select().from(employees).where(...); // Waits for above
const products = await db.select().from(products).where(...);   // Waits for above
```

**Why:** Sequential queries multiply latency. Parallel queries run concurrently.

---

### 1.3 Backend: Batch Instead of Loop

**Rule:** One query with `IN (...)` is better than N queries with `= `.

**Good:**
```typescript
const employeeIds = employees.map(e => e.id);
const allProducts = await db
  .select()
  .from(employeeProducts)
  .where(inArray(employeeProducts.employeeId, employeeIds));

// Then group in memory
const productsByEmployee = groupBy(allProducts, p => p.employeeId);
```

**Bad:**
```typescript
for (const employee of employees) {
  const products = await db
    .select()
    .from(employeeProducts)
    .where(eq(employeeProducts.employeeId, employee.id)); // N queries
}
```

**Why:** Network round-trip overhead dominates. Batching amortizes this cost.

---

### 1.4 Frontend: Compute Expensive Work Once

**Rule:** Aggregates, sorting, grouping should happen on the backend OR be memoized.

**Good - Backend computes:**
```typescript
// API returns pre-computed aggregates
const { data: runs } = useDeliveryRuns({ date });
// runs[0].aggregates.quantityEntrusted already calculated
```

**Good - Frontend memoizes:**
```typescript
const groupedItems = useMemo(() => {
  return items.reduce((acc, item) => {
    // expensive grouping
  }, {});
}, [items]);
```

**Bad:**
```typescript
// Re-computes on every render, every keystroke
const groupedItems = items.reduce((acc, item) => {...}, {});
```

**Why:** React re-renders frequently. Unmemoized work wastes CPU cycles.

---

### 1.5 Frontend: Memoize Stable Callbacks

**Rule:** Functions passed to children should be wrapped in `useCallback`.

**Good:**
```typescript
const handleQuantityChange = useCallback((id, value) => {
  setItems(prev => ({ ...prev, [id]: value }));
}, []); // Empty deps = stable reference

// Child component can use React.memo safely
<input onChange={(e) => handleQuantityChange(item.id, e.target.value)} />
```

**Bad:**
```typescript
// New function every render, child re-renders unnecessarily
const handleQuantityChange = (id, value) => {
  setItems(prev => ({ ...prev, [id]: value }));
};
```

**Why:** Stable references enable React's optimization (memo, PureComponent).

---

## 2. Data Model Principles

### 2.1 Always Consider Temporal Dimension

**Rule:** Any value that might change over time needs effective dates.

**Applies to:**
- Commission rates (`effectiveFrom`, `effectiveTo`)
- Prices (`validFrom`, `validTo`)
- Employee assignments (`startDate`, `endDate`)

**Query pattern:**
```typescript
.where(and(
  eq(table.entityId, id),
  lte(table.effectiveFrom, asOfDate),
  or(
    isNull(table.effectiveTo),
    gte(table.effectiveTo, asOfDate)
  )
))
```

**Why:** Historical accuracy for payroll, audit, and reporting.

---

### 2.2 Record WHO and WHEN

**Rule:** Every mutation should capture:
- `createdBy` / `updatedBy` (user who made the change)
- `createdAt` / `updatedAt` (when it happened)

**For soft deletes:**
- `deletedBy` / `deletedAt` instead of hard delete

**Why:** Accountability, debugging, audit compliance.

---

### 2.3 Use Explicit Enums

**Rule:** Status fields should have constrained values.

**Good:**
```typescript
status: varchar('status', { length: 20 }).notNull()
  .default('draft')
  .$type<'draft' | 'in_progress' | 'validated' | 'closed'>()
```

**Bad:**
```typescript
status: text('status') // Any string possible
```

**Why:** Type safety, valid state transitions, self-documenting code.

---

## 3. API Design Principles

### 3.1 Consistent Response Shape

**Rule:** All endpoints return `{ success: boolean, data?: T, error?: { code, message } }`.

**Example:**
```typescript
// Success
{ success: true, data: { runs: [...] } }

// Error
{ success: false, error: { code: 'VALIDATION_ERROR', message: '...' } }
```

**Why:** Frontend can handle responses uniformly.

---

### 3.2 Use Transactions for Multi-Step Operations

**Rule:** Any operation touching multiple tables should be atomic.

**Example - Delivery Validation:**
```typescript
await db.transaction(async (trx) => {
  // 1. Update delivery status
  await trx.update(deliveryRuns).set({ status: 'validated' }).where(...);
  
  // 2. Create cash collection
  await trx.insert(cashCollections).values({ ... });
  
  // 3. Update inventory (future)
  await trx.update(inventoryItems).set({ ... }).where(...);
});
// All succeed or all fail - no partial state
```

**Why:** Data integrity. Partial operations leave system in inconsistent state.

---

### 3.3 Validate at the Edge

**Rule:** Use Zod validation on ALL inputs before touching database.

**Pattern:**
```typescript
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const schema = z.object({
  quantityEntrusted: z.number().min(0),
  quantityReturned: z.number().min(0)
}).refine(data => data.quantityReturned <= data.quantityEntrusted, {
  message: 'Return cannot exceed entrusted'
});

app.post('/items', zValidator('json', schema), async (c) => {
  const data = c.req.valid('json'); // Type-safe, validated
  // ...
});
```

**Why:** Fail fast, clear error messages, type safety.

---

## 4. Frontend Architecture Principles

### 4.1 Separate Server State from UI State

**Rule:** Use TanStack Query for server state, React state for UI state only.

**Server State (TanStack Query):**
- Delivery runs
- Collections
- Employees
- Products

**UI State (useState):**
- Selected date
- Expanded rows
- Form input values (before save)
- Modal open/closed

**Pattern:**
```typescript
// Server state - cached, synchronized
const { data: runs } = useDeliveryRuns({ date });

// UI state - ephemeral
const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
```

**Why:** Server state has different lifecycle (caching, refetching) than UI state.

---

### 4.2 Optimistic Updates for Better UX

**Rule:** Update UI immediately, rollback on error.

**Pattern:**
```typescript
const updateMutation = useMutation({
  mutationFn: updateDeliveryItem,
  
  // Optimistic update
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: deliveryKeys.all });
    const previous = queryClient.getQueryData(deliveryKeys.all);
    queryClient.setQueryData(deliveryKeys.all, (old) => 
      old.map(item => item.id === newData.id ? { ...item, ...newData } : item)
    );
    return { previous };
  },
  
  // Rollback on error
  onError: (err, newData, context) => {
    queryClient.setQueryData(deliveryKeys.all, context.previous);
  },
  
  // Sync with server
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
  }
});
```

**Why:** Feels instant to users, but stays consistent with server.

---

### 4.3 Invalidate Related Queries on Mutations

**Rule:** After mutation, invalidate all affected query keys.

**Example - Validate Delivery:**
```typescript
onSuccess: () => {
  // Invalidate delivery data
  queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
  queryClient.invalidateQueries({ queryKey: ['deliveries', 'run', runId] });
  
  // Invalidate cash collections (auto-created)
  queryClient.invalidateQueries({ queryKey: ['collections'] });
  
  // Invalidate dashboard stats
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}
```

**Why:** Stale data causes confusion. Aggressive invalidation ensures consistency.

---

## 5. TanStack Query Best Practices

### 5.1 Query Keys Must Be Deterministic

**Rule:** Query keys must include all parameters that affect the result.

**Good:**
```typescript
queryKey: ['deliveries', 'runs', { date, locationId, employeeId }]
```

**Bad:**
```typescript
queryKey: ['deliveries'] // Too broad - won't refetch when date changes
```

**Why:** Incorrect keys cause stale data or excessive refetching.

---

### 5.2 Use Appropriate Stale Time

**Rule:** Balance freshness with server load.

**Guidelines:**
- Reference data (products, employees): `staleTime: 5 * 60 * 1000` (5 min)
- Transactional data (runs, collections): `staleTime: 30 * 1000` (30 sec)
- Real-time needs (stock levels): `staleTime: 0` + polling

**Why:** Prevents unnecessary API calls while keeping data reasonably fresh.

---

### 5.3 Prefetch Anticipated Data

**Rule:** When user is likely to navigate somewhere, prefetch that data.

**Pattern:**
```typescript
// Prefetch next day when hovering date picker
onMouseEnter={() => {
  queryClient.prefetchQuery({
    queryKey: deliveryKeys.runs({ date: nextDate }),
    queryFn: () => getDeliveryRuns({ date: nextDate }),
    staleTime: 60 * 1000 // Keep prefetched data fresh for 1 min
  });
}}
```

**Why:** Perceived performance - data loads instantly when user acts.

---

## 6. Code Organization

### 6.1 Domain-Based Folder Structure

```
gerpain_backend/src/
├── domains/
│   ├── deliveries/
│   │   ├── routes.ts       # API endpoints
│   │   ├── service.ts      # Business logic
│   │   ├── types.ts        # Domain types
│   │   └── helpers.ts      # Pure functions
│   ├── collections/
│   ├── employees/
│   └── products/
├── shared/
│   ├── database/
│   │   ├── schema.ts       # Drizzle schema
│   │   └── migrations/
│   └── middleware/         # Auth, logging, etc.
└── config/                 # Environment, database connection
```

**Why:** Features are self-contained. Easy to find related code.

---

### 6.2 API Client Pattern (Frontend)

```typescript
// lib/api/deliveries.ts
export async function getDeliveryRuns(params: DeliveryRunsParams) {
  const response = await fetch(`/api/v1/deliveries/runs?${new URLSearchParams(params)}`);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}

// lib/hooks/useDeliveries.ts
export function useDeliveryRuns(params: DeliveryRunsParams) {
  return useQuery({
    queryKey: deliveryKeys.runs(params),
    queryFn: () => getDeliveryRuns(params),
    staleTime: 30 * 1000,
  });
}
```

**Why:** Clean separation - API client knows HTTP, hook knows React Query.

---

## 7. Testing Principles

### 7.1 Test Business Logic, Not Implementation

**Good - Test the what:**
```typescript
test('computeRunAggregates calculates revenue correctly', () => {
  const run = mockRun({ items: [
    { quantityEntrusted: 10, quantityReturned: 3, unitPrice: 100 },
    { quantityEntrusted: 5, quantityReturned: 0, unitPrice: 200 }
  ]});
  
  const result = computeRunAggregates(run);
  
  expect(result.revenue).toBe(1700); // (7 * 100) + (5 * 200)
  expect(result.returnRate).toBe(0.2); // 3/15
});
```

**Bad - Test the how:**
```typescript
test('calls reduce 3 times', () => { ... }); // Brittle
```

---

### 7.2 Integration Tests for Critical Paths

**Critical paths to test:**
1. Create delivery → Add items → Validate → Verify collection created
2. Record cash collection → Verify balance updated
3. Employee assignment → Product visible in delivery form

---

## 8. UI/UX Principles

### 8.1 Loading States

**Rule:** Never show blank space while loading.

**Pattern:**
```typescript
if (isLoading) return <TableSkeleton rows={5} />;
if (isError) return <ErrorState onRetry={refetch} />;
if (data.length === 0) return <EmptyState action={createNew} />;
return <DataTable data={data} />;
```

---

### 8.2 Error Handling

**Rule:** All errors should be:
- **Visible** - Don't fail silently
- **Actionable** - Tell user what to do
- **In French** - Primary language for users

**Pattern:**
```typescript
onError: (error) => {
  notify({
    variant: 'error',
    title: 'Erreur',
    description: error.message || 'Une erreur est survenue. Veuillez réessayer.'
  });
}
```

---

### 8.3 Form Validation Feedback

**Rule:** Validate on blur, not just on submit. Show inline errors.

**Pattern:**
```typescript
<input 
  value={quantity}
  onChange={handleChange}
  onBlur={validate}
  className={cn(
    'border rounded',
    error && 'border-red-500 ring-1 ring-red-500'
  )}
/>
{error && <span className="text-red-500 text-sm">{error}</span>}
```

---

## 9. Security Principles

### 9.1 Always Validate Organization Scope

**Rule:** Every query must include `organizationId` filter.

**Pattern:**
```typescript
const organizationId = c.req.header('X-Organization-ID');
if (!organizationId) return c.json({ error: 'Missing org' }, 400);

// All queries scoped
.where(eq(table.organizationId, organizationId))
```

**Why:** Prevents cross-tenant data leaks.

---

### 9.2 Use Transactions for Financial Operations

**Rule:** Any operation touching money or inventory must be atomic.

**Applies to:**
- Delivery validation
- Cash collection recording
- Payroll processing
- Inventory adjustments

---

## 10. Deployment & Operations

### 10.1 Migrations Must Be Reversible

**Rule:** Every migration should have a `down` migration (except destructive ops with data loss).

**Pattern:**
```typescript
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('users')
    .addColumn('phone', 'varchar(20)')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('users')
    .dropColumn('phone')
    .execute();
}
```

---

### 10.2 Log Critical Operations

**Rule:** Log to `auditLogs` table for:
- Data mutations
- Status changes
- Financial transactions
- Permission changes

---

## Quick Reference Checklist

Before submitting code:

- [ ] Database filters use SQL WHERE, not JS filter
- [ ] Independent queries use `Promise.all()`
- [ ] Loop queries are batched with `inArray`
- [ ] Frontend computes are memoized with `useMemo`
- [ ] Callbacks passed to children use `useCallback`
- [ ] Query keys include all parameters
- [ ] Mutations invalidate related queries
- [ ] API validates with Zod
- [ ] Multi-step operations use transactions
- [ ] All user-facing text is in French
- [ ] Loading and error states handled

---

*These guidelines are living documents. Update as patterns evolve.*

*Last updated: 2026-02-08*
