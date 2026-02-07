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
import { eq, and } from "drizzle-orm";
import { locations as locationsTable } from "../../shared/database/schema.js";
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

  // If date provided, auto-create draft runs for active delivery employees if none exist
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

    // If no runs exist, create drafts for all active delivery employees
    if (existingRuns.length === 0) {
      // Get active delivery employees
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
        );

      // Get all active products for this bakery as fallback
      const activeProducts = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.organizationId, organizationId),
            eq(products.isActive, true)
          )
        );

      // Create draft runs for each employee
      for (const employee of deliveryEmployees) {
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

        // Use assigned products or fallback to all active products
        const productIdsToUse = assignedProducts.length > 0 
          ? assignedProducts.map(p => p.productId)
          : activeProducts.map(p => p.id);

        // Get the first location for the bakery (needed for locationId)
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

        // Create the run
        const [run] = await db.insert(deliveryRuns).values({
          organizationId,
          bakeryId,
          employeeId: employee.id,
          locationId: firstLocation.id,
          date,
          status: "draft",
          notes: "",
        }).returning();

        // Create delivery items for each product (qty 0)
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

  // Get items and employee/location info for each run
  const runsWithDetails = await Promise.all(
    filtered.map(async (run) => {
      const items = await db
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.runId, run.id));

      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, run.employeeId));

      const [location] = await db
        .select()
        .from(locationsTable)
        .where(eq(locationsTable.id, run.locationId));

      // Check if employee has assigned products — if so, filter items
      const assignedProducts = await db
        .select({ productId: employeeProducts.productId })
        .from(employeeProducts)
        .where(
          and(
            eq(employeeProducts.employeeId, run.employeeId),
            eq(employeeProducts.isActive, true)
          )
        );
      const assignedIds = assignedProducts.map(p => p.productId);
      const filteredItems = assignedIds.length > 0
        ? items.filter(item => assignedIds.includes(item.productId))
        : items;

      // Get product names for items and compute quantitySold
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

      return {
        ...run,
        notes: run.notes ?? "",
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown",
        locationName: location?.name ?? "Unknown",
        items: itemsWithProducts,
      };
    })
  );

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

  // Check if employee has assigned products — if so, filter items
  const assignedProducts = await db
    .select({ productId: employeeProducts.productId })
    .from(employeeProducts)
    .where(
      and(
        eq(employeeProducts.employeeId, run.employeeId),
        eq(employeeProducts.isActive, true)
      )
    );
  const assignedIds = assignedProducts.map(p => p.productId);
  const filteredItems = assignedIds.length > 0
    ? items.filter(item => assignedIds.includes(item.productId))
    : items;

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
