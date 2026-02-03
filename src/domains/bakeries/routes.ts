import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  getBakeriesForOrganization,
  getBakeryById,
  createBakery,
  updateBakery,
  deleteBakery,
  canCreateBakery,
} from "./service.js";
import { insertBakerySchema } from "../../shared/database/schema.js";

const bakeriesRoutes = new Hono();

// List bakeries for organization
bakeriesRoutes.get("/", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json(
      { success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } },
      400
    );
  }

  const result = await getBakeriesForOrganization(organizationId);

  return c.json({ success: true, data: result });
});

// Get single bakery
bakeriesRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json(
      { success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } },
      400
    );
  }

  const bakery = await getBakeryById(id, organizationId);

  if (!bakery) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Bakery not found" } },
      404
    );
  }

  return c.json({ success: true, data: bakery });
});

// Check tier limit status
bakeriesRoutes.get("/tier/status", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json(
      { success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } },
      400
    );
  }

  const status = await canCreateBakery(organizationId);

  return c.json({ success: true, data: status });
});

// Create bakery
const createBakerySchema = insertBakerySchema.omit({ organizationId: true });

bakeriesRoutes.post(
  "/",
  zValidator("json", createBakerySchema),
  async (c) => {
    const organizationId = c.req.header("X-Organization-ID");

    if (!organizationId) {
      return c.json(
        { success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } },
        400
      );
    }

    try {
      const data = c.req.valid("json");
      const bakery = await createBakery({
        ...data,
        organizationId,
      });

      return c.json({ success: true, data: bakery }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create bakery";
      return c.json(
        { success: false, error: { code: "TIER_LIMIT", message } },
        403
      );
    }
  }
);

// Update bakery
const updateBakerySchema = insertBakerySchema.partial().omit({ organizationId: true });

bakeriesRoutes.put(
  "/:id",
  zValidator("json", updateBakerySchema),
  async (c) => {
    const id = c.req.param("id");
    const organizationId = c.req.header("X-Organization-ID");

    if (!organizationId) {
      return c.json(
        { success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } },
        400
      );
    }

    const data = c.req.valid("json");
    const bakery = await updateBakery(id, organizationId, data);

    if (!bakery) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Bakery not found" } },
        404
      );
    }

    return c.json({ success: true, data: bakery });
  }
);

// Delete bakery (soft delete by setting isActive=false)
bakeriesRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json(
      { success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } },
      400
    );
  }

  // Soft delete - just deactivate
  const bakery = await updateBakery(id, organizationId, { isActive: false });

  if (!bakery) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Bakery not found" } },
      404
    );
  }

  return c.json({ success: true, data: bakery });
});

export { bakeriesRoutes };
