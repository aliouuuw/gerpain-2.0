import { Hono } from "hono";
import { db } from "../../config/database.js";
import { 
  deliveryRuns, 
  deliveryItems, 
  employees,
  products,
  insertDeliveryRunSchema, 
  insertDeliveryItemSchema 
} from "../../shared/database/schema.js";
import { eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const deliveriesRoutes = new Hono();

// List delivery runs
deliveriesRoutes.get("/runs", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const date = c.req.query("date");
  const employeeId = c.req.query("employeeId");
  const locationId = c.req.query("locationId");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const runs = await db
    .select()
    .from(deliveryRuns)
    .where(eq(deliveryRuns.organizationId, organizationId));

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

  // Get items and employee info for each run
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

      // Get product names for items
      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId));
          return {
            ...item,
            productName: product?.name || "Unknown",
          };
        })
      );

      return {
        ...run,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown",
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

  // Get product names
  const itemsWithProducts = await Promise.all(
    items.map(async (item) => {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId));
      return {
        ...item,
        productName: product?.name || "Unknown",
      };
    })
  );

  return c.json({
    success: true,
    data: {
      ...run,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown",
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

// Validate delivery run
deliveriesRoutes.post("/runs/:id/validate", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");
  // Note: validatedBy would come from auth middleware in production

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [updated] = await db
    .update(deliveryRuns)
    .set({ 
      status: "validated", 
      validatedAt: new Date(),
      updatedAt: new Date() 
    })
    .where(and(eq(deliveryRuns.id, id), eq(deliveryRuns.organizationId, organizationId)))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Delivery run not found" } }, 404);
  }

  return c.json({ success: true, data: updated });
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
