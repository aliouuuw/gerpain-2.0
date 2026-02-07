import { Hono } from "hono";
import { db } from "../../config/database.js";
import { products, insertProductSchema } from "../../shared/database/schema.js";
import { eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

const productsRoutes = new Hono();

// List products
productsRoutes.get("/", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const bakeryId = c.req.header("X-Bakery-ID");
  const categoryId = c.req.query("categoryId");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  let query = db.select().from(products).where(eq(products.organizationId, organizationId));

  const result = await query;

  // Filter by bakery if provided (null = org-wide products, or specific bakery)
  let filtered = bakeryId
    ? result.filter(p => !p.bakeryId || p.bakeryId === bakeryId)
    : result;

  // Filter by category if provided
  if (categoryId) {
    filtered = filtered.filter(p => p.categoryId === categoryId);
  }

  return c.json({ success: true, data: filtered });
});

// Get single product
productsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.organizationId, organizationId)));

  if (!product) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, 404);
  }

  return c.json({ success: true, data: product });
});

// Create product
const createProductSchema = insertProductSchema.omit({ organizationId: true, bakeryId: true });

productsRoutes.post(
  "/",
  zValidator("json", createProductSchema),
  async (c) => {
    const organizationId = c.req.header("X-Organization-ID");
    const bakeryId = c.req.header("X-Bakery-ID");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    const body = c.req.valid("json");

    const [product] = await db.insert(products).values({
      ...body,
      organizationId,
      ...(bakeryId ? { bakeryId } : {}),
    }).returning();

    return c.json({ success: true, data: product }, 201);
  }
);

// Update product
productsRoutes.put(
  "/:id",
  zValidator("json", insertProductSchema.partial()),
  async (c) => {
    const id = c.req.param("id");
    const organizationId = c.req.header("X-Organization-ID");
    const body = c.req.valid("json");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    const [updated] = await db
      .update(products)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.organizationId, organizationId)))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, 404);
    }

    return c.json({ success: true, data: updated });
  }
);

// Delete product
productsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [deleted] = await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.organizationId, organizationId)))
    .returning();

  if (!deleted) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, 404);
  }

  return c.json({ success: true, data: { id } });
});

export { productsRoutes };
