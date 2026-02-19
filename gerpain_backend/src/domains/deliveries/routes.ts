import { Hono } from "hono";
import { db } from "../../config/database.js";
import { 
  deliveryRuns, 
  deliveryItems, 
  employees,
  products,
  employeeProducts,
  cashCollections,
  insertDeliveryRunSchema, 
  insertDeliveryItemSchema 
} from "../../shared/database/schema.js";
import { eq, and, inArray, asc } from "drizzle-orm";
import { locations as locationsTable, employeeLocations } from "../../shared/database/schema.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const deliveriesRoutes = new Hono();

// List delivery runs - auto-creates drafts for date if none exist
deliveriesRoutes.get("/runs", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const bakeryId = c.req.header("X-Bakery-ID");
  const date = c.req.query("date");
  const employeeId = c.req.query("employeeId");
  const locationId = c.req.query("locationId");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  // If date provided, auto-create draft runs for active delivery employees missing runs
  if (date && bakeryId) {
    // Check if runs exist for this date
    const existingRuns = await db
      .select()
      .from(deliveryRuns)
      .where(
        and(
          eq(deliveryRuns.organizationId, organizationId),
          eq(deliveryRuns.bakeryId, bakeryId),
          eq(deliveryRuns.date, date)
        )
      );

    // Get active delivery employees, sorted by sortOrder and hireDate
    const deliveryEmployees = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.organizationId, organizationId),
          eq(employees.bakeryId, bakeryId),
          eq(employees.role, "delivery"),
          eq(employees.status, "active")
        )
      )
      .orderBy(asc(employees.sortOrder), asc(employees.hireDate));

    // Keep only employees hired on or before the selected date
    const eligibleEmployees = deliveryEmployees.filter(
      (employee) => !employee.hireDate || employee.hireDate <= date
    );

    // Find employees who don't have a run for this date yet
    const existingEmployeeIds = new Set(existingRuns.map(r => r.employeeId));
    const missingEmployees = eligibleEmployees.filter(e => !existingEmployeeIds.has(e.id));

    if (missingEmployees.length > 0) {
      // Get all active products for this bakery (used only for details/unitPrice snapshots)
      const activeProducts = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.organizationId, organizationId),
            eq(products.isActive, true)
          )
        );

      // Create draft runs for each missing employee
      for (const employee of missingEmployees) {
        // Get employee's assigned products
        const assignedProducts = await db
          .select({ productId: employeeProducts.productId })
          .from(employeeProducts)
          .where(
            and(
              eq(employeeProducts.employeeId, employee.id),
              eq(employeeProducts.isActive, true)
            )
          );

        // Only use assigned products (no fallback)
        const productIdsToUse = assignedProducts.map(p => p.productId);

        // Get employee's primary location, fall back to first bakery location
        const primaryLocation = await db
          .select()
          .from(employeeLocations)
          .where(
            and(
              eq(employeeLocations.employeeId, employee.id),
              eq(employeeLocations.isPrimary, true)
            )
          )
          .limit(1);

        let locationIdToUse: string;
        if (primaryLocation.length > 0) {
          locationIdToUse = primaryLocation[0].locationId;
        } else {
          // Fall back to first bakery location
          const [firstLocation] = await db
            .select()
            .from(locationsTable)
            .where(
              and(
                eq(locationsTable.organizationId, organizationId),
                eq(locationsTable.bakeryId, bakeryId)
              )
            )
            .limit(1);

          if (!firstLocation) continue;
          locationIdToUse = firstLocation.id;
        }

        // Create the run
        const [run] = await db.insert(deliveryRuns).values({
          organizationId,
          bakeryId,
          employeeId: employee.id,
          locationId: locationIdToUse,
          date,
          status: "draft",
          notes: "",
        }).returning();

        // Create delivery items for each assigned product (qty 0)
        const productsToUse = activeProducts.filter(p => productIdsToUse.includes(p.id));
        if (productsToUse.length > 0) {
          await db.insert(deliveryItems).values(
            productsToUse.map(product => ({
              runId: run.id,
              productId: product.id,
              period: "Matin" as const,
              quantityEntrusted: 0,
              quantityReturned: 0,
              unitPrice: product.unitPrice,
            }))
          );
        }
      }
    }
  }

  // Now fetch and return the runs (including any newly created ones)
  let query = db
    .select()
    .from(deliveryRuns)
    .where(eq(deliveryRuns.organizationId, organizationId));

  // Filter by bakery if provided
  if (bakeryId) {
    query = db
      .select()
      .from(deliveryRuns)
      .where(
        and(
          eq(deliveryRuns.organizationId, organizationId),
          eq(deliveryRuns.bakeryId, bakeryId)
        )
      );
  }

  const runs = await query;

  // Filter by query params
  let filtered = runs;
  if (date) {
    filtered = filtered.filter(r => r.date === date);
  }
  if (employeeId) {
    filtered = filtered.filter(r => r.employeeId === employeeId);
  }
  if (locationId) {
    filtered = filtered.filter(r => r.locationId === locationId);
  }

  // Batch lookups to avoid N+1 queries
  if (filtered.length === 0) {
    return c.json({ success: true, data: [] });
  }

  const runIds = filtered.map((r) => r.id);
  const employeeIds = [...new Set(filtered.map((r) => r.employeeId))];
  const locationIds = [...new Set(filtered.map((r) => r.locationId))];

  const [allItems, allEmployees, allLocations, allAssignments] = await Promise.all([
    db.select().from(deliveryItems).where(inArray(deliveryItems.runId, runIds)),
    db.select().from(employees).where(inArray(employees.id, employeeIds)),
    db.select().from(locationsTable).where(inArray(locationsTable.id, locationIds)),
    db.select({ employeeId: employeeProducts.employeeId, productId: employeeProducts.productId })
      .from(employeeProducts)
      .where(and(inArray(employeeProducts.employeeId, employeeIds), eq(employeeProducts.isActive, true))),
  ]);

  // Collect all product IDs referenced by items and fetch product names in one query
  const allProductIds = [...new Set(allItems.map((i) => i.productId))];
  const allProducts = allProductIds.length > 0
    ? await db.select().from(products).where(inArray(products.id, allProductIds))
    : [];

  // Build lookup maps
  const employeeMap = new Map(allEmployees.map((e) => [e.id, e]));
  const locationMap = new Map(allLocations.map((l) => [l.id, l]));
  const productMap = new Map(allProducts.map((p) => [p.id, p]));
  const itemsByRun = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const list = itemsByRun.get(item.runId) ?? [];
    list.push(item);
    itemsByRun.set(item.runId, list);
  }
  const assignmentsByEmployee = new Map<string, Set<string>>();
  for (const a of allAssignments) {
    const set = assignmentsByEmployee.get(a.employeeId) ?? new Set();
    set.add(a.productId);
    assignmentsByEmployee.set(a.employeeId, set);
  }

  // Hide runs where selected date is before employee hire date
  const filteredByHireDate = date
    ? filtered.filter((run) => {
        const employee = employeeMap.get(run.employeeId);
        return !employee?.hireDate || employee.hireDate <= date;
      })
    : filtered;

  // Assemble response in-memory
  const runsWithDetails = filteredByHireDate.map((run) => {
    const employee = employeeMap.get(run.employeeId);
    const location = locationMap.get(run.locationId);
    const assignedProductIds = assignmentsByEmployee.get(run.employeeId);
    const items = itemsByRun.get(run.id) ?? [];

    const filteredItems = !assignedProductIds || assignedProductIds.size === 0
      ? []
      : items.filter((item) => assignedProductIds.has(item.productId));

    const itemsWithProducts = filteredItems.map((item) => {
      const product = productMap.get(item.productId);
      return {
        ...item,
        productName: product?.name || "Unknown",
        quantitySold: item.quantityEntrusted - item.quantityReturned,
      };
    });

    return {
      ...run,
      notes: run.notes ?? "",
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown",
      employeeSortOrder: employee?.sortOrder ?? 0,
      employeeHireDate: employee?.hireDate ?? null,
      locationName: location?.name ?? "Unknown",
      items: itemsWithProducts,
    };
  });

  // Sort runs by employee sortOrder, then hireDate
  runsWithDetails.sort((a, b) => {
    if (a.employeeSortOrder !== b.employeeSortOrder) return a.employeeSortOrder - b.employeeSortOrder;
    if (a.employeeHireDate && b.employeeHireDate) return a.employeeHireDate.localeCompare(b.employeeHireDate);
    if (a.employeeHireDate) return -1;
    if (b.employeeHireDate) return 1;
    return 0;
  });

  return c.json({ success: true, data: runsWithDetails });
});

// Get single delivery run
deliveriesRoutes.get("/runs/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [run] = await db
    .select()
    .from(deliveryRuns)
    .where(and(eq(deliveryRuns.id, id), eq(deliveryRuns.organizationId, organizationId)));

  if (!run) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Delivery run not found" } }, 404);
  }

  // Get items
  const items = await db
    .select()
    .from(deliveryItems)
    .where(eq(deliveryItems.runId, id));

  // Get employee
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, run.employeeId));

  // Get location
  const [location] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, run.locationId));

  const assignedProducts = await db
    .select({ productId: employeeProducts.productId })
    .from(employeeProducts)
    .where(
      and(
        eq(employeeProducts.employeeId, run.employeeId),
        eq(employeeProducts.isActive, true)
      )
    );

  const assignedProductIds = new Set(assignedProducts.map((p) => p.productId));
  const filteredItems = assignedProductIds.size === 0
    ? []
    : items.filter((item) => assignedProductIds.has(item.productId));

  // Get product names and compute quantitySold
  const itemsWithProducts = await Promise.all(
    filteredItems.map(async (item) => {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId));
      return {
        ...item,
        productName: product?.name || "Unknown",
        quantitySold: item.quantityEntrusted - item.quantityReturned,
      };
    })
  );

  return c.json({
    success: true,
    data: {
      ...run,
      notes: run.notes ?? "",
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown",
      locationName: location?.name ?? "Unknown",
      items: itemsWithProducts,
    },
  });
});

// Create delivery run
deliveriesRoutes.post(
  "/runs",
  zValidator("json", insertDeliveryRunSchema),
  async (c) => {
    const body = c.req.valid("json");

    const [run] = await db.insert(deliveryRuns).values(body).returning();

    return c.json({ success: true, data: { ...run, items: [] } }, 201);
  }
);

// Update delivery run
deliveriesRoutes.patch(
  "/runs/:id",
  zValidator("json", insertDeliveryRunSchema.partial()),
  async (c) => {
    const id = c.req.param("id");
    const organizationId = c.req.header("X-Organization-ID");
    const body = c.req.valid("json");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    const [updated] = await db
      .update(deliveryRuns)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(deliveryRuns.id, id), eq(deliveryRuns.organizationId, organizationId)))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Delivery run not found" } }, 404);
    }

    return c.json({ success: true, data: updated });
  }
);

// Validate delivery run - auto-creates cash collection
deliveriesRoutes.post("/runs/:id/validate", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");
  const bakeryId = c.req.header("X-Bakery-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  // Get the run with items for calculating expected amount
  const [run] = await db
    .select()
    .from(deliveryRuns)
    .where(and(eq(deliveryRuns.id, id), eq(deliveryRuns.organizationId, organizationId)));

  if (!run) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Delivery run not found" } }, 404);
  }

  // Get all items for this run
  const items = await db
    .select()
    .from(deliveryItems)
    .where(eq(deliveryItems.runId, id));

  // Block validation if no quantities entrusted
  const totalEntrusted = items.reduce((sum, item) => sum + item.quantityEntrusted, 0);
  if (totalEntrusted === 0) {
    return c.json({ 
      success: false, 
      error: { 
        code: "ZERO_QUANTITY", 
        message: "Impossible de valider une tournée sans quantité confiée" 
      } 
    }, 400);
  }

  // Calculate expectedAmount = sum((quantityEntrusted - quantityReturned) × unitPrice)
  const expectedAmount = items.reduce((sum, item) => {
    const sold = item.quantityEntrusted - item.quantityReturned;
    return sum + (sold * item.unitPrice);
  }, 0);

  // Update run status to validated
  const [updated] = await db
    .update(deliveryRuns)
    .set({ 
      status: "validated", 
      validatedAt: new Date(),
      updatedAt: new Date() 
    })
    .where(and(eq(deliveryRuns.id, id), eq(deliveryRuns.organizationId, organizationId)))
    .returning();

  // Check if cash collection already exists for this delivery run
  const [existingCollection] = await db
    .select()
    .from(cashCollections)
    .where(eq(cashCollections.deliveryRunId, id));

  let collection;
  if (existingCollection) {
    // Update existing collection's expectedAmount
    [collection] = await db
      .update(cashCollections)
      .set({
        expectedAmount,
        updatedAt: new Date(),
      })
      .where(eq(cashCollections.id, existingCollection.id))
      .returning();
  } else {
    // Create new cash collection
    [collection] = await db
      .insert(cashCollections)
      .values({
        organizationId,
        bakeryId: bakeryId || run.bakeryId,
        employeeId: run.employeeId,
        locationId: run.locationId,
        deliveryRunId: id,
        date: run.date,
        expectedAmount,
        actualAmount: 0,
        cashAmount: 0,
        cardAmount: 0,
        mobileAmount: 0,
        status: "pending",
        isSettled: false,
      })
      .returning();
  }

  return c.json({ 
    success: true, 
    data: {
      ...updated,
      collection: {
        id: collection.id,
        expectedAmount: collection.expectedAmount,
      }
    }
  });
});

// Add item to delivery run
deliveriesRoutes.post(
  "/runs/:runId/items",
  zValidator("json", insertDeliveryItemSchema.omit({ runId: true })),
  async (c) => {
    const runId = c.req.param("runId");
    const body = c.req.valid("json");

    const [item] = await db.insert(deliveryItems).values({ ...body, runId }).returning();

    // Get product name
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId));

    return c.json({ 
      success: true, 
      data: { ...item, productName: product?.name || "Unknown" } 
    }, 201);
  }
);

// Update delivery item
deliveriesRoutes.patch(
  "/items/:id",
  zValidator("json", z.object({
    quantityEntrusted: z.number().int().min(0).optional(),
    quantityReturned: z.number().int().min(0).optional(),
    unitPrice: z.number().int().positive().optional(),
    period: z.enum(["Matin", "Après-midi", "Soir"]).optional(),
  })),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const [updated] = await db
      .update(deliveryItems)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(deliveryItems.id, id))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Delivery item not found" } }, 404);
    }

    return c.json({ success: true, data: updated });
  }
);

// Delete delivery item
deliveriesRoutes.delete("/items/:id", async (c) => {
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(deliveryItems)
    .where(eq(deliveryItems.id, id))
    .returning();

  if (!deleted) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Delivery item not found" } }, 404);
  }

  return c.json({ success: true, data: { id } });
});

export { deliveriesRoutes };
