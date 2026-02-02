import { Hono } from "hono";
import { db } from "../../config/database.js";
import { locations, insertLocationSchema } from "../../shared/database/schema.js";
import { eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const locationsRoutes = new Hono();

// List locations
locationsRoutes.get("/", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  
  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const result = await db
    .select()
    .from(locations)
    .where(eq(locations.organizationId, organizationId));

  return c.json({ success: true, data: result });
});

// Get single location
locationsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [location] = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, id), eq(locations.organizationId, organizationId)));

  if (!location) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Location not found" } }, 404);
  }

  return c.json({ success: true, data: location });
});

// Create location
locationsRoutes.post(
  "/",
  zValidator("json", insertLocationSchema),
  async (c) => {
    const body = c.req.valid("json");

    const [location] = await db.insert(locations).values(body).returning();

    return c.json({ success: true, data: location }, 201);
  }
);

// Update location
locationsRoutes.put(
  "/:id",
  zValidator("json", insertLocationSchema.partial()),
  async (c) => {
    const id = c.req.param("id");
    const organizationId = c.req.header("X-Organization-ID");
    const body = c.req.valid("json");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    const [updated] = await db
      .update(locations)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(locations.id, id), eq(locations.organizationId, organizationId)))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Location not found" } }, 404);
    }

    return c.json({ success: true, data: updated });
  }
);

// Delete location
locationsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [deleted] = await db
    .delete(locations)
    .where(and(eq(locations.id, id), eq(locations.organizationId, organizationId)))
    .returning();

  if (!deleted) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Location not found" } }, 404);
  }

  return c.json({ success: true, data: { id } });
});

export { locationsRoutes };
