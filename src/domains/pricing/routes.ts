import { Hono } from "hono";
import { db } from "../../config/database.js";
import { pricingRules, insertPricingRuleSchema } from "../../shared/database/schema.js";
import { eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

const pricingRoutes = new Hono();

// List pricing rules
pricingRoutes.get("/", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const productId = c.req.query("productId");
  const locationId = c.req.query("locationId");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  let query = db.select().from(pricingRules).where(eq(pricingRules.organizationId, organizationId));

  const result = await query;

  // Filter by product if provided
  let filtered = productId
    ? result.filter(r => r.productId === productId)
    : result;

  // Filter by location if provided
  if (locationId) {
    filtered = filtered.filter(r => r.locationId === locationId);
  }

  return c.json({ success: true, data: filtered });
});

// Get single pricing rule
pricingRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [rule] = await db
    .select()
    .from(pricingRules)
    .where(and(eq(pricingRules.id, id), eq(pricingRules.organizationId, organizationId)));

  if (!rule) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Pricing rule not found" } }, 404);
  }

  return c.json({ success: true, data: rule });
});

// Create pricing rule
pricingRoutes.post(
  "/",
  zValidator("json", insertPricingRuleSchema),
  async (c) => {
    const body = c.req.valid("json");

    // Check for existing rule for this product+location combo
    const [existing] = await db
      .select()
      .from(pricingRules)
      .where(
        and(
          eq(pricingRules.productId, body.productId),
          eq(pricingRules.locationId, body.locationId),
          eq(pricingRules.organizationId, body.organizationId)
        )
      );

    if (existing) {
      return c.json({ success: false, error: { code: "DUPLICATE", message: "Pricing rule already exists for this product and location" } }, 409);
    }

    const [rule] = await db.insert(pricingRules).values(body).returning();

    return c.json({ success: true, data: rule }, 201);
  }
);

// Update pricing rule
pricingRoutes.put(
  "/:id",
  zValidator("json", insertPricingRuleSchema.partial()),
  async (c) => {
    const id = c.req.param("id");
    const organizationId = c.req.header("X-Organization-ID");
    const body = c.req.valid("json");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    const [updated] = await db
      .update(pricingRules)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(pricingRules.id, id), eq(pricingRules.organizationId, organizationId)))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Pricing rule not found" } }, 404);
    }

    return c.json({ success: true, data: updated });
  }
);

// Delete pricing rule
pricingRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [deleted] = await db
    .delete(pricingRules)
    .where(and(eq(pricingRules.id, id), eq(pricingRules.organizationId, organizationId)))
    .returning();

  if (!deleted) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Pricing rule not found" } }, 404);
  }

  return c.json({ success: true, data: { id } });
});

export { pricingRoutes };
