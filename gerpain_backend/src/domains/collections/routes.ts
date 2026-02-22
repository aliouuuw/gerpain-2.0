import { Hono, type Context } from "hono";
import { db } from "../../config/database.js";
import { 
  cashCollections, 
  employees,
  deliveryRuns,
  insertCashCollectionSchema 
} from "../../shared/database/schema.js";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { cache, CacheNamespace, CacheTTL } from "../../config/redis.js";
import { requireAuthOrApiKey } from "../../middleware/auth.js";

const collectionsRoutes = new Hono();

function invalidState(c: Context, currentStatus: string | null) {
  return c.json(
    {
      success: false,
      error: {
        code: "INVALID_STATE",
        message: currentStatus
          ? `Invalid state transition from '${currentStatus}'`
          : "Collection not found",
      },
    },
    currentStatus ? 409 : 404
  );
}

// Get overview - per-employee aggregates for a period
collectionsRoutes.get("/overview", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const bakeryId = c.req.header("X-Bakery-ID");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const role = c.req.query("role");
  const isSettled = c.req.query("isSettled");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  // Build cache key from query params
  const cacheKey = `${organizationId}:${bakeryId || 'all'}:${startDate || 'all'}:${endDate || 'all'}:${role || 'all'}:${isSettled || 'all'}`;
  
  // Try cache first (versioned - O(1) invalidation)
  const cached = await cache.get<typeof finalOverview>(CacheNamespace.COLLECTIONS_OVERVIEW, cacheKey);
  if (cached) {
    return c.json({
      success: true,
      data: cached,
      cached: true,
    });
  }

  // Build WHERE conditions for collections
  const collectionConditions = [eq(cashCollections.organizationId, organizationId)];
  if (bakeryId) {
    collectionConditions.push(eq(cashCollections.bakeryId, bakeryId));
  }
  if (startDate) {
    collectionConditions.push(gte(cashCollections.date, startDate));
  }
  if (endDate) {
    collectionConditions.push(lte(cashCollections.date, endDate));
  }
  if (isSettled !== undefined) {
    const settledFlag = isSettled === "true";
    collectionConditions.push(eq(cashCollections.isSettled, settledFlag));
  }

  // Build WHERE conditions for employees
  const employeeConditions = [
    eq(employees.organizationId, organizationId),
    eq(employees.status, "active")
  ];
  if (role) {
    employeeConditions.push(eq(employees.role, role));
  }

  // Fetch active employees and their collections in parallel
  const [activeEmployees, filteredCollections] = await Promise.all([
    db.select().from(employees).where(and(...employeeConditions)),
    db.select().from(cashCollections).where(and(...collectionConditions))
  ]);

  // Group collections by employee in memory (SQL GROUP BY would require complex aggregation)
  const collectionsByEmployee = new Map<string, typeof filteredCollections>();
  for (const col of filteredCollections) {
    if (!collectionsByEmployee.has(col.employeeId)) {
      collectionsByEmployee.set(col.employeeId, []);
    }
    collectionsByEmployee.get(col.employeeId)!.push(col);
  }

  // Calculate aggregates per employee
  const overview = activeEmployees.map((employee) => {
    const employeeCollections = collectionsByEmployee.get(employee.id) || [];
    
    const tournées = employeeCollections.length;
    const totalExpected = employeeCollections.reduce((sum, c) => sum + c.expectedAmount, 0);
    const totalCollected = employeeCollections.reduce((sum, c) => sum + (c.actualAmount || 0), 0);
    const solde = totalCollected - totalExpected; // negative = owes money
    const unsettledCount = employeeCollections.filter(c => !c.isSettled).length;

    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      role: employee.role,
      roleLabel: employee.role === "delivery" ? "Livreur" : 
                 employee.role === "cashier" ? "Caissier" : 
                 employee.role === "manager" ? "Manager" : 
                 employee.role === "baker" ? "Boulanger" : employee.role,
      tournées,
      totalExpected,
      totalCollected,
      solde,
      unsettledCount,
    };
  });

  // Filter out employees with no collections if showing unsettled only
  const finalOverview = isSettled === "false" 
    ? overview.filter(e => e.unsettledCount > 0)
    : overview;

  // Cache the result (versioned key, medium TTL)
  await cache.set(CacheNamespace.COLLECTIONS_OVERVIEW, cacheKey, finalOverview, CacheTTL.MEDIUM);

  return c.json({
    success: true,
    data: finalOverview,
    cached: false,
  });
});

// List cash collections with filters
collectionsRoutes.get("/", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const bakeryId = c.req.header("X-Bakery-ID");
  const date = c.req.query("date");
  const status = c.req.query("status");
  const locationId = c.req.query("locationId");
  const employeeId = c.req.query("employeeId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const isSettled = c.req.query("isSettled");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  // Build WHERE conditions dynamically
  const conditions = [eq(cashCollections.organizationId, organizationId)];
  
  if (bakeryId) {
    conditions.push(eq(cashCollections.bakeryId, bakeryId));
  }
  if (date) {
    conditions.push(eq(cashCollections.date, date));
  }
  if (startDate) {
    conditions.push(gte(cashCollections.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(cashCollections.date, endDate));
  }
  if (status) {
    conditions.push(eq(cashCollections.status, status));
  }
  if (locationId) {
    conditions.push(eq(cashCollections.locationId, locationId));
  }
  if (employeeId) {
    conditions.push(eq(cashCollections.employeeId, employeeId));
  }
  if (isSettled !== undefined) {
    const settledFlag = isSettled === "true";
    conditions.push(eq(cashCollections.isSettled, settledFlag));
  }

  // Single query with all filters applied in SQL
  const collections = await db
    .select()
    .from(cashCollections)
    .where(and(...conditions));

  // Batch fetch related data
  const filteredEmployeeIds = [...new Set(collections.map((c) => c.employeeId))];
  const employeeRows = filteredEmployeeIds.length
    ? await db.select().from(employees).where(and(inArray(employees.id, filteredEmployeeIds), eq(employees.status, "active")))
    : [];
  const employeeMap = new Map(employeeRows.map((e) => [e.id, e]));

  const activeCollections = collections.filter((c) => employeeMap.has(c.employeeId));

  const runIds = [...new Set(activeCollections.map((c) => c.deliveryRunId).filter(Boolean) as string[])];
  const runRows = runIds.length
    ? await db.select().from(deliveryRuns).where(inArray(deliveryRuns.id, runIds))
    : [];
  const runMap = new Map(runRows.map((r) => [r.id, r]));

  const collectionsWithDetails = activeCollections.map((col) => {
    const employee = employeeMap.get(col.employeeId);
    const deliveryRun = col.deliveryRunId ? runMap.get(col.deliveryRunId) ?? null : null;
    return {
      ...col,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown",
      employeeRole: employee?.role || "unknown",
      routeLabel: employee?.role === "delivery" ? "Livreur" : employee?.role === "cashier" ? "Caissier" : employee?.role || "Unknown",
      source: deliveryRun ? "Livraison" : "Boutique",
    };
  });

  return c.json({ success: true, data: collectionsWithDetails });
});

// Get single collection
collectionsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [collection] = await db
    .select()
    .from(cashCollections)
    .where(and(eq(cashCollections.id, id), eq(cashCollections.organizationId, organizationId)));

  if (!collection) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Collection not found" } }, 404);
  }

  // Get employee
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, collection.employeeId));

  return c.json({
    success: true,
    data: {
      ...collection,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown",
      routeLabel: employee?.role === "delivery" ? "Livreur" : employee?.role || "Unknown",
    },
  });
});

// Create cash collection
collectionsRoutes.post(
  "/",
  requireAuthOrApiKey,
  zValidator("json", insertCashCollectionSchema),
  async (c) => {
    const body = c.req.valid("json");

    const [collection] = await db.insert(cashCollections).values(body).returning();

    return c.json({ success: true, data: collection }, 201);
  }
);

collectionsRoutes.post("/:id/reopen", requireAuthOrApiKey, async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [updated] = await db
    .update(cashCollections)
    .set({
      status: "pending",
      submittedAt: null,
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(cashCollections.id, id),
        eq(cashCollections.organizationId, organizationId),
        eq(cashCollections.status, "rejected")
      )
    )
    .returning();

  if (!updated) {
    const [existing] = await db
      .select({ status: cashCollections.status })
      .from(cashCollections)
      .where(and(eq(cashCollections.id, id), eq(cashCollections.organizationId, organizationId)));
    return invalidState(c, existing?.status ?? null);
  }

  await cache.invalidate(CacheNamespace.COLLECTIONS_OVERVIEW);

  return c.json({ success: true, data: updated });
});

// Update cash collection
collectionsRoutes.patch(
  "/:id",
  requireAuthOrApiKey,
  zValidator("json", insertCashCollectionSchema.partial()),
  async (c) => {
    const id = c.req.param("id");
    const organizationId = c.req.header("X-Organization-ID");
    const body = c.req.valid("json");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    // Get current collection to calculate variance
    const [current] = await db
      .select()
      .from(cashCollections)
      .where(and(eq(cashCollections.id, id), eq(cashCollections.organizationId, organizationId)));
    
    if (!current) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Collection not found" } }, 404);
    }

    if (current.status !== "pending" && current.status !== "rejected") {
      return invalidState(c, current.status);
    }

    // Recalculate variance if any payment field is being updated
    let updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.cashAmount !== undefined || body.cardAmount !== undefined || body.mobileAmount !== undefined) {
      const cashAmount = body.cashAmount ?? current.cashAmount ?? 0;
      const cardAmount = body.cardAmount ?? current.cardAmount ?? 0;
      const mobileAmount = body.mobileAmount ?? current.mobileAmount ?? 0;
      const actualAmount = cashAmount + cardAmount + mobileAmount;
      
      updateData.actualAmount = actualAmount;
      updateData.variance = actualAmount - current.expectedAmount;
    }

    const [updated] = await db
      .update(cashCollections)
      .set(updateData)
      .where(
        and(
          eq(cashCollections.id, id),
          eq(cashCollections.organizationId, organizationId),
          inArray(cashCollections.status, ["pending", "rejected"])
        )
      )
      .returning();

    if (!updated) {
      const [existing] = await db
        .select({ status: cashCollections.status })
        .from(cashCollections)
        .where(and(eq(cashCollections.id, id), eq(cashCollections.organizationId, organizationId)));
      return invalidState(c, existing?.status ?? null);
    }

    // Invalidate cache for this organization
    await cache.invalidate(CacheNamespace.COLLECTIONS_OVERVIEW);

    return c.json({ success: true, data: updated });
  }
);

// Submit collection for validation
collectionsRoutes.post("/:id/submit", requireAuthOrApiKey, async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [updated] = await db
    .update(cashCollections)
    .set({ 
      status: "submitted", 
      submittedAt: new Date(),
      rejectionReason: null,
      updatedAt: new Date() 
    })
    .where(
      and(
        eq(cashCollections.id, id),
        eq(cashCollections.organizationId, organizationId),
        inArray(cashCollections.status, ["pending", "rejected"])
      )
    )
    .returning();

  if (!updated) {
    const [existing] = await db
      .select({ status: cashCollections.status })
      .from(cashCollections)
      .where(and(eq(cashCollections.id, id), eq(cashCollections.organizationId, organizationId)));
    return invalidState(c, existing?.status ?? null);
  }

  // Invalidate cache
  await cache.invalidate(CacheNamespace.COLLECTIONS_OVERVIEW);

  return c.json({ success: true, data: updated });
});

// Validate collection
collectionsRoutes.post("/:id/validate", requireAuthOrApiKey, async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");
  // Note: validatedBy would come from auth middleware in production

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const user = ((c as unknown as { get: (key: string) => unknown }).get("user") as { id: string } | null) ?? null;

  const [updated] = await db
    .update(cashCollections)
    .set({ 
      status: "validated", 
      validatedAt: new Date(),
      validatedBy: user?.id ?? null,
      rejectionReason: null,
      updatedAt: new Date() 
    })
    .where(
      and(
        eq(cashCollections.id, id),
        eq(cashCollections.organizationId, organizationId),
        eq(cashCollections.status, "submitted")
      )
    )
    .returning();

  if (!updated) {
    const [existing] = await db
      .select({ status: cashCollections.status })
      .from(cashCollections)
      .where(and(eq(cashCollections.id, id), eq(cashCollections.organizationId, organizationId)));
    return invalidState(c, existing?.status ?? null);
  }

  // Invalidate cache
  await cache.invalidate(CacheNamespace.COLLECTIONS_OVERVIEW);

  return c.json({ success: true, data: updated });
});

// Reject collection
collectionsRoutes.post(
  "/:id/reject",
  requireAuthOrApiKey,
  zValidator("json", z.object({ reason: z.string().min(1) })),
  async (c) => {
    const id = c.req.param("id");
    const organizationId = c.req.header("X-Organization-ID");
    const { reason } = c.req.valid("json");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    const [updated] = await db
      .update(cashCollections)
      .set({ 
        status: "rejected", 
        rejectionReason: reason,
        validatedAt: null,
        validatedBy: null,
        updatedAt: new Date() 
      })
      .where(
        and(
          eq(cashCollections.id, id),
          eq(cashCollections.organizationId, organizationId),
          eq(cashCollections.status, "submitted")
        )
      )
      .returning();

    if (!updated) {
      const [existing] = await db
        .select({ status: cashCollections.status })
        .from(cashCollections)
        .where(and(eq(cashCollections.id, id), eq(cashCollections.organizationId, organizationId)));
      return invalidState(c, existing?.status ?? null);
    }

    // Invalidate cache
    await cache.invalidate(CacheNamespace.COLLECTIONS_OVERVIEW);

    return c.json({ success: true, data: updated });
  }
);

// Get aggregates for period (summary cards data)
collectionsRoutes.get("/aggregates", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const employeeId = c.req.query("employeeId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  // Build cache key
  const cacheKey = `${organizationId}:${employeeId || 'all'}:${startDate || 'all'}:${endDate || 'all'}`;

  // Use getOrSet pattern for cleaner caching
  const { data: aggregates, cached } = await cache.getOrSet(
    CacheNamespace.COLLECTIONS_AGGREGATES,
    cacheKey,
    async () => {
      // Build WHERE conditions
      const conditions = [eq(cashCollections.organizationId, organizationId)];
      if (employeeId) {
        conditions.push(eq(cashCollections.employeeId, employeeId));
      }
      if (startDate) {
        conditions.push(gte(cashCollections.date, startDate));
      }
      if (endDate) {
        conditions.push(lte(cashCollections.date, endDate));
      }

      // Single query with filters in SQL
      const collections = await db
        .select()
        .from(cashCollections)
        .where(and(...conditions));

      // Calculate aggregates
      const totalExpected = collections.reduce((sum, c) => sum + c.expectedAmount, 0);
      const totalCollected = collections.reduce((sum, c) => sum + (c.actualAmount || 0), 0);
      const outstandingBalance = totalExpected - totalCollected;
      const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

      return {
        totalExpected,
        totalCollected,
        outstandingBalance,
        collectionRate,
        count: collections.length,
      };
    },
    CacheTTL.SHORT // 30 seconds for aggregates
  );

  return c.json({
    success: true,
    data: aggregates,
    cached,
  });
});

// Settle all collections for a period
collectionsRoutes.post("/settle", requireAuthOrApiKey, async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const employeeId = c.req.query("employeeId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  // Build WHERE conditions for collections to settle
  const conditions = [
    eq(cashCollections.organizationId, organizationId),
    eq(cashCollections.isSettled, false),
    eq(cashCollections.status, "validated")
  ];
  if (employeeId) {
    conditions.push(eq(cashCollections.employeeId, employeeId));
  }
  if (startDate) {
    conditions.push(gte(cashCollections.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(cashCollections.date, endDate));
  }

  // Get collections to settle with filters in SQL
  const toSettle = await db
    .select()
    .from(cashCollections)
    .where(and(...conditions));

  if (toSettle.length === 0) {
    return c.json({
      success: true,
      data: {
        settledCount: 0,
        settledIds: [],
      }
    });
  }

  // Batch update all collections in a single query
  const settledIds = toSettle.map(c => c.id);
  await db
    .update(cashCollections)
    .set({ isSettled: true, updatedAt: new Date() })
    .where(inArray(cashCollections.id, settledIds));

  // Invalidate cache
  await cache.invalidate(CacheNamespace.COLLECTIONS_OVERVIEW);

  return c.json({
    success: true,
    data: {
      settledCount: settledIds.length,
      settledIds,
    }
  });
});

export { collectionsRoutes };
