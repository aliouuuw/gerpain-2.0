import { Hono } from "hono";
import { db } from "../../config/database.js";
import { inventoryItems, insertInventoryItemSchema } from "../../shared/database/schema.js";
import { eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

const inventoryRoutes = new Hono();

// List stock levels (inventory items)
inventoryRoutes.get("/stock", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const locationId = c.req.query("locationId");
  const productId = c.req.query("productId");
  const lowStock = c.req.query("lowStock");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  let query = db.select().from(inventoryItems).where(eq(inventoryItems.organizationId, organizationId));

  const result = await query;

  let filtered = locationId
    ? result.filter(item => item.locationId === locationId)
    : result;

  if (productId) {
    filtered = filtered.filter(item => item.productId === productId);
  }

  if (lowStock === "true") {
    filtered = filtered.filter(item => {
      const rp = item.reorderPoint ?? 0;
      return rp > 0 && item.currentQuantity <= rp;
    });
  }

  const enriched = filtered.map(item => {
    const availableQuantity = item.currentQuantity - item.reservedQuantity;
    const rp = item.reorderPoint ?? 0;
    let status: "normal" | "low" | "critical" | "out" = "normal";
    
    if (item.currentQuantity === 0) {
      status = "out";
    } else if (rp > 0 && item.currentQuantity <= rp) {
      status = "critical";
    } else if (rp > 0 && item.currentQuantity <= rp * 1.5) {
      status = "low";
    }

    return {
      ...item,
      availableQuantity,
      status,
    };
  });

  enriched.sort((a, b) => {
    const statusPriority = { critical: 0, low: 1, out: 2, normal: 3 };
    return statusPriority[a.status] - statusPriority[b.status];
  });

  return c.json({ 
    success: true, 
    data: enriched,
    summary: {
      totalItems: enriched.length,
      criticalItems: enriched.filter(i => i.status === "critical").length,
      lowItems: enriched.filter(i => i.status === "low").length,
      outOfStock: enriched.filter(i => i.status === "out").length,
    }
  });
});

// Get single inventory item
inventoryRoutes.get("/stock/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.organizationId, organizationId)));

  if (!item) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Inventory item not found" } }, 404);
  }

  const availableQuantity = item.currentQuantity - item.reservedQuantity;

  return c.json({ 
    success: true, 
    data: { ...item, availableQuantity }
  });
});

// Create or update inventory item
const createInventoryItemSchema = insertInventoryItemSchema.omit({ organizationId: true });

inventoryRoutes.post(
  "/stock",
  zValidator("json", createInventoryItemSchema),
  async (c) => {
    const organizationId = c.req.header("X-Organization-ID");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    const body = c.req.valid("json");

    const [existing] = await db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.locationId, body.locationId),
          eq(inventoryItems.productId, body.productId),
          eq(inventoryItems.organizationId, organizationId)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(inventoryItems)
        .set({ 
          currentQuantity: body.currentQuantity,
          reservedQuantity: body.reservedQuantity ?? 0,
          reorderPoint: body.reorderPoint ?? 0,
          maxStockLevel: body.maxStockLevel,
          updatedAt: new Date()
        })
        .where(eq(inventoryItems.id, existing.id))
        .returning();

      return c.json({ success: true, data: updated });
    }

    const [item] = await db.insert(inventoryItems).values({ ...body, organizationId }).returning();
    return c.json({ success: true, data: item }, 201);
  }
);

// Update inventory item
inventoryRoutes.put(
  "/stock/:id",
  zValidator("json", insertInventoryItemSchema.partial()),
  async (c) => {
    const id = c.req.param("id");
    const organizationId = c.req.header("X-Organization-ID");
    const body = c.req.valid("json");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    const [updated] = await db
      .update(inventoryItems)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.organizationId, organizationId)))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Inventory item not found" } }, 404);
    }

    return c.json({ success: true, data: updated });
  }
);

// Adjust stock quantity
inventoryRoutes.post("/stock/:id/adjust", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");
  const { adjustment, reason } = await c.req.json();

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  if (typeof adjustment !== "number") {
    return c.json({ success: false, error: { code: "INVALID_DATA", message: "Adjustment must be a number" } }, 400);
  }

  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.organizationId, organizationId)));

  if (!item) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Inventory item not found" } }, 404);
  }

  const newQuantity = Math.max(0, item.currentQuantity + adjustment);

  const [updated] = await db
    .update(inventoryItems)
    .set({ 
      currentQuantity: newQuantity,
      updatedAt: new Date()
    })
    .where(eq(inventoryItems.id, id))
    .returning();

  return c.json({ 
    success: true, 
    data: { ...updated, adjustment, reason }
  });
});

// Delete inventory item
inventoryRoutes.delete("/stock/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [deleted] = await db
    .delete(inventoryItems)
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.organizationId, organizationId)))
    .returning();

  if (!deleted) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Inventory item not found" } }, 404);
  }

  return c.json({ success: true, data: { id } });
});

export { inventoryRoutes };
