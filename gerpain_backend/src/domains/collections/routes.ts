import { Hono } from "hono";
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

const collectionsRoutes = new Hono();

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

  // Get all collections for the period
  let query = db
    .select()
    .from(cashCollections)
    .where(eq(cashCollections.organizationId, organizationId));

  const allCollections = await query;

  // Filter by date range and bakery
  let filtered = allCollections;
  if (bakeryId) {
    filtered = filtered.filter(c => c.bakeryId === bakeryId);
  }
  if (startDate) {
    filtered = filtered.filter(c => c.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(c => c.date <= endDate);
  }
  if (isSettled !== undefined) {
    const settledFlag = isSettled === "true";
    filtered = filtered.filter(c => c.isSettled === settledFlag);
  }

  // Get all employees for the organization
  let employeesQuery = db
    .select()
    .from(employees)
    .where(eq(employees.organizationId, organizationId));

  const allEmployees = await employeesQuery;

  // Filter employees by role if specified
  let filteredEmployees = allEmployees;
  if (role) {
    filteredEmployees = filteredEmployees.filter(e => e.role === role);
  }

  // Only include active employees in operational views
  filteredEmployees = filteredEmployees.filter((e) => e.status === "active");

  // Group collections by employee and calculate aggregates
  const overview = await Promise.all(
    filteredEmployees.map(async (employee) => {
      const employeeCollections = filtered.filter(c => c.employeeId === employee.id);
      
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
    })
  );

  // Filter out employees with no collections if showing unsettled only
  const finalOverview = isSettled === "false" 
    ? overview.filter(e => e.unsettledCount > 0)
    : overview;

  return c.json({
    success: true,
    data: finalOverview,
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

  let query = db
    .select()
    .from(cashCollections)
    .where(eq(cashCollections.organizationId, organizationId));

  // Apply filters
  if (bakeryId) {
    query = db
      .select()
      .from(cashCollections)
      .where(
        and(
          eq(cashCollections.organizationId, organizationId),
          eq(cashCollections.bakeryId, bakeryId)
        )
      );
  }

  const collections = await query;

  // Filter by query params
  let filtered = collections;
  if (date) {
    filtered = filtered.filter(c => c.date === date);
  }
  if (startDate) {
    filtered = filtered.filter(c => c.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(c => c.date <= endDate);
  }
  if (status) {
    filtered = filtered.filter(c => c.status === status);
  }
  if (locationId) {
    filtered = filtered.filter(c => c.locationId === locationId);
  }
  if (employeeId) {
    filtered = filtered.filter(c => c.employeeId === employeeId);
  }
  if (isSettled !== undefined) {
    const settledFlag = isSettled === "true";
    filtered = filtered.filter(c => c.isSettled === settledFlag);
  }

  const filteredEmployeeIds = [...new Set(filtered.map((c) => c.employeeId))];
  const employeeRows = filteredEmployeeIds.length
    ? await db.select().from(employees).where(and(inArray(employees.id, filteredEmployeeIds), eq(employees.status, "active")))
    : [];
  const employeeMap = new Map(employeeRows.map((e) => [e.id, e]));

  const activeCollections = filtered.filter((c) => employeeMap.has(c.employeeId));

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
  zValidator("json", insertCashCollectionSchema),
  async (c) => {
    const body = c.req.valid("json");

    const [collection] = await db.insert(cashCollections).values(body).returning();

    return c.json({ success: true, data: collection }, 201);
  }
);

// Update cash collection
collectionsRoutes.patch(
  "/:id",
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
      .where(eq(cashCollections.id, id));
    
    if (!current) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Collection not found" } }, 404);
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
      .where(and(eq(cashCollections.id, id), eq(cashCollections.organizationId, organizationId)))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Collection not found" } }, 404);
    }

    return c.json({ success: true, data: updated });
  }
);

// Submit collection for validation
collectionsRoutes.post("/:id/submit", async (c) => {
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
      updatedAt: new Date() 
    })
    .where(and(eq(cashCollections.id, id), eq(cashCollections.organizationId, organizationId)))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Collection not found" } }, 404);
  }

  return c.json({ success: true, data: updated });
});

// Validate collection
collectionsRoutes.post("/:id/validate", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");
  // Note: validatedBy would come from auth middleware in production

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [updated] = await db
    .update(cashCollections)
    .set({ 
      status: "validated", 
      validatedAt: new Date(),
      updatedAt: new Date() 
    })
    .where(and(eq(cashCollections.id, id), eq(cashCollections.organizationId, organizationId)))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Collection not found" } }, 404);
  }

  return c.json({ success: true, data: updated });
});

// Reject collection
collectionsRoutes.post(
  "/:id/reject",
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
        updatedAt: new Date() 
      })
      .where(and(eq(cashCollections.id, id), eq(cashCollections.organizationId, organizationId)))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Collection not found" } }, 404);
    }

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

  let query = db
    .select()
    .from(cashCollections)
    .where(eq(cashCollections.organizationId, organizationId));

  const collections = await query;

  // Filter by employee and date range
  let filtered = collections;
  if (employeeId) {
    filtered = filtered.filter(c => c.employeeId === employeeId);
  }
  if (startDate) {
    filtered = filtered.filter(c => c.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(c => c.date <= endDate);
  }

  // Calculate aggregates
  const totalExpected = filtered.reduce((sum, c) => sum + c.expectedAmount, 0);
  const totalCollected = filtered.reduce((sum, c) => sum + (c.actualAmount || 0), 0);
  const outstandingBalance = totalExpected - totalCollected;
  const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  return c.json({
    success: true,
    data: {
      totalExpected,
      totalCollected,
      outstandingBalance,
      collectionRate,
      count: filtered.length,
    }
  });
});

// Settle all collections for a period
collectionsRoutes.post("/settle", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const employeeId = c.req.query("employeeId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  // Get collections to settle
  let query = db
    .select()
    .from(cashCollections)
    .where(
      and(
        eq(cashCollections.organizationId, organizationId),
        eq(cashCollections.isSettled, false)
      )
    );

  const collections = await query;

  // Filter by params
  let toSettle = collections;
  if (employeeId) {
    toSettle = toSettle.filter(c => c.employeeId === employeeId);
  }
  if (startDate) {
    toSettle = toSettle.filter(c => c.date >= startDate);
  }
  if (endDate) {
    toSettle = toSettle.filter(c => c.date <= endDate);
  }

  // Mark all as settled
  const settledIds: string[] = [];
  for (const col of toSettle) {
    await db
      .update(cashCollections)
      .set({ isSettled: true, updatedAt: new Date() })
      .where(eq(cashCollections.id, col.id));
    settledIds.push(col.id);
  }

  return c.json({
    success: true,
    data: {
      settledCount: settledIds.length,
      settledIds,
    }
  });
});

export { collectionsRoutes };
