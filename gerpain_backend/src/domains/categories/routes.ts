import { Hono } from "hono";
import { db } from "../../config/database.js";
import { categories } from "../../shared/database/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { insertCategorySchema } from "../../shared/database/schema.js";

const app = new Hono();

// Get all categories for organization
app.get("/", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  if (!organizationId) {
    return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Organization ID required" } }, 401);
  }

  try {
    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.organizationId, organizationId))
      .orderBy(desc(categories.sortOrder), categories.name);

    return c.json({ success: true, data: allCategories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return c.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch categories" } }, 500);
  }
});

// Get category by ID
app.get("/:id", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  if (!organizationId) {
    return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Organization ID required" } }, 401);
  }

  const id = c.req.param("id");

  try {
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.organizationId, organizationId)));

    if (!category) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Category not found" } }, 404);
    }

    return c.json({ success: true, data: category });
  } catch (error) {
    console.error("Error fetching category:", error);
    return c.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch category" } }, 500);
  }
});

// Create category
const createCategorySchema = insertCategorySchema.omit({ organizationId: true });

app.post("/", zValidator("json", createCategorySchema), async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  if (!organizationId) {
    return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Organization ID required" } }, 401);
  }

  const data = c.req.valid("json");

  try {
    const [category] = await db
      .insert(categories)
      .values({ ...data, organizationId })
      .returning();

    return c.json({ success: true, data: category }, 201);
  } catch (error) {
    console.error("Error creating category:", error);
    return c.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create category" } }, 500);
  }
});

// Update category
app.put("/:id", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  if (!organizationId) {
    return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Organization ID required" } }, 401);
  }

  const id = c.req.param("id");
  const body = await c.req.json();

  const updateSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  });

  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return c.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input data" } }, 400);
  }

  try {
    const [category] = await db
      .update(categories)
      .set({ ...result.data, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.organizationId, organizationId)))
      .returning();

    if (!category) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Category not found" } }, 404);
    }

    return c.json({ success: true, data: category });
  } catch (error) {
    console.error("Error updating category:", error);
    return c.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update category" } }, 500);
  }
});

// Delete category
app.delete("/:id", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  if (!organizationId) {
    return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Organization ID required" } }, 401);
  }

  const id = c.req.param("id");

  try {
    const [category] = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.organizationId, organizationId)))
      .returning();

    if (!category) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Category not found" } }, 404);
    }

    return c.json({ success: true, data: { id: category.id } });
  } catch (error) {
    console.error("Error deleting category:", error);
    return c.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete category" } }, 500);
  }
});

export default app;
