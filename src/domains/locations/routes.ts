import { Hono } from "hono";
import { db } from "../../config/database.js";
import { locations, insertLocationSchema } from "../../shared/database/schema.js";
import { eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const locationsRoutes = new Hono();

// List locations - filtered by bakery
locationsRoutes.get("/", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const bakeryId = c.req.header("X-Bakery-ID");
  
  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const result = await db
    .select()
    .from(locations)
    .where(
      bakeryId 
        ? and(eq(locations.organizationId, organizationId), eq(locations.bakeryId, bakeryId))!
        : eq(locations.organizationId, organizationId)
    );

  return c.json({ success: true, data: result });
});

// Get single location
locationsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");
  const bakeryId = c.req.header("X-Bakery-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [location] = await db
    .select()
    .from(locations)
    .where(
      bakeryId
        ? and(eq(locations.id, id), eq(locations.organizationId, organizationId), eq(locations.bakeryId, bakeryId))!
        : and(eq(locations.id, id), eq(locations.organizationId, organizationId))!
    );

  if (!location) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Location not found" } }, 404);
  }

  return c.json({ success: true, data: location });
});

// Create location
const createLocationSchema = insertLocationSchema.omit({ organizationId: true, bakeryId: true });

locationsRoutes.post(
  "/",
  zValidator("json", createLocationSchema),
  async (c) => {
    const organizationId = c.req.header("X-Organization-ID");
    const bakeryId = c.req.header("X-Bakery-ID");

    if (!organizationId || !bakeryId) {
      return c.json({ success: false, error: { code: "MISSING_CONTEXT", message: "Organization ID and Bakery ID required" } }, 400);
    }

    const body = c.req.valid("json");

    const [location] = await db.insert(locations).values({ ...body, organizationId, bakeryId }).returning();

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
    const bakeryId = c.req.header("X-Bakery-ID");
    const body = c.req.valid("json");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    const [updated] = await db
      .update(locations)
      .set({ ...body, updatedAt: new Date() })
      .where(
        bakeryId
          ? and(eq(locations.id, id), eq(locations.organizationId, organizationId), eq(locations.bakeryId, bakeryId))!
          : and(eq(locations.id, id), eq(locations.organizationId, organizationId))!
      )
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
  const bakeryId = c.req.header("X-Bakery-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [deleted] = await db
    .delete(locations)
    .where(
      bakeryId
        ? and(eq(locations.id, id), eq(locations.organizationId, organizationId), eq(locations.bakeryId, bakeryId))!
        : and(eq(locations.id, id), eq(locations.organizationId, organizationId))!
    )
    .returning();

  if (!deleted) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Location not found" } }, 404);
  }

  return c.json({ success: true, data: { id } });
});

export { locationsRoutes };
