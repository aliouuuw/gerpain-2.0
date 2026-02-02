import { Hono } from "hono";
import { db } from "../../config/database.js";
import { 
  cashCollections, 
  employees,
  insertCashCollectionSchema 
} from "../../shared/database/schema.js";
import { eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const collectionsRoutes = new Hono();

// List cash collections
collectionsRoutes.get("/", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const date = c.req.query("date");
  const status = c.req.query("status");
  const locationId = c.req.query("locationId");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const collections = await db
    .select()
    .from(cashCollections)
    .where(eq(cashCollections.organizationId, organizationId));

  // Filter by query params
  let filtered = collections;
  if (date) {
    filtered = filtered.filter(c => c.date === date);
  }
  if (status) {
    filtered = filtered.filter(c => c.status === status);
  }
  if (locationId) {
    filtered = filtered.filter(c => c.locationId === locationId);
  }

  // Get employee info for each collection
  const collectionsWithDetails = await Promise.all(
    filtered.map(async (col) => {
      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, col.employeeId));

      return {
        ...col,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown",
        routeLabel: employee?.role === "delivery" ? "Livreur" : employee?.role || "Unknown",
      };
    })
  );

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

    // Calculate variance if actualAmount is provided
    let updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.actualAmount !== undefined) {
      const [current] = await db
        .select()
        .from(cashCollections)
        .where(eq(cashCollections.id, id));
      
      if (current) {
        updateData.variance = body.actualAmount - current.expectedAmount;
      }
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

export { collectionsRoutes };
