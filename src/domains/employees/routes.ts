import { Hono } from "hono";
import { db } from "../../config/database.js";
import { employees, employeeLocations, insertEmployeeSchema } from "../../shared/database/schema.js";
import { eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const employeesRoutes = new Hono();

// List employees
employeesRoutes.get("/", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const role = c.req.query("role");
  const status = c.req.query("status");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const result = await db
    .select()
    .from(employees)
    .where(eq(employees.organizationId, organizationId));

  // Filter by role and status if provided
  let filtered = result;
  if (role) {
    filtered = filtered.filter(e => e.role === role);
  }
  if (status) {
    filtered = filtered.filter(e => e.status === status);
  }

  // Get locations for each employee
  const employeesWithLocations = await Promise.all(
    filtered.map(async (emp) => {
      const locs = await db
        .select()
        .from(employeeLocations)
        .where(eq(employeeLocations.employeeId, emp.id));
      return {
        ...emp,
        locations: locs.map(l => l.locationId),
      };
    })
  );

  return c.json({ success: true, data: employeesWithLocations });
});

// Get single employee
employeesRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [employee] = await db
    .select()
    .from(employees)
    .where(and(eq(employees.id, id), eq(employees.organizationId, organizationId)));

  if (!employee) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Employee not found" } }, 404);
  }

  // Get locations
  const locs = await db
    .select()
    .from(employeeLocations)
    .where(eq(employeeLocations.employeeId, id));

  return c.json({
    success: true,
    data: { ...employee, locations: locs.map(l => l.locationId) },
  });
});

// Create employee
const createEmployeeSchema = insertEmployeeSchema.omit({ organizationId: true, bakeryId: true }).extend({
  locations: z.array(z.string().uuid()).optional(),
});

employeesRoutes.post(
  "/",
  zValidator("json", createEmployeeSchema),
  async (c) => {
    const organizationId = c.req.header("X-Organization-ID");
    const bakeryId = c.req.header("X-Bakery-ID");

    if (!organizationId || !bakeryId) {
      return c.json({ success: false, error: { code: "MISSING_CONTEXT", message: "Organization ID and Bakery ID required" } }, 400);
    }

    const { locations: locationIds, ...bodyData } = c.req.valid("json");
    const employeeData = { ...bodyData, organizationId, bakeryId };

    const [employee] = await db.insert(employees).values(employeeData).returning();

    // Assign locations if provided
    if (locationIds && locationIds.length > 0) {
      await db.insert(employeeLocations).values(
        locationIds.map((locId, index) => ({
          employeeId: employee.id,
          locationId: locId,
          isPrimary: index === 0,
        }))
      );
    }

    return c.json({ 
      success: true, 
      data: { ...employee, locations: locationIds || [] } 
    }, 201);
  }
);

// Update employee
employeesRoutes.put(
  "/:id",
  zValidator("json", createEmployeeSchema.partial()),
  async (c) => {
    const id = c.req.param("id");
    const organizationId = c.req.header("X-Organization-ID");
    const { locations: locationIds, ...employeeData } = c.req.valid("json");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    const [updated] = await db
      .update(employees)
      .set({ ...employeeData, updatedAt: new Date() })
      .where(and(eq(employees.id, id), eq(employees.organizationId, organizationId)))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Employee not found" } }, 404);
    }

    // Update locations if provided
    if (locationIds !== undefined) {
      // Remove existing
      await db.delete(employeeLocations).where(eq(employeeLocations.employeeId, id));
      
      // Add new
      if (locationIds.length > 0) {
        await db.insert(employeeLocations).values(
          locationIds.map((locId, index) => ({
            employeeId: id,
            locationId: locId,
            isPrimary: index === 0,
          }))
        );
      }
    }

    return c.json({ 
      success: true, 
      data: { ...updated, locations: locationIds } 
    });
  }
);

// Deactivate employee
employeesRoutes.post("/:id/deactivate", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [updated] = await db
    .update(employees)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(and(eq(employees.id, id), eq(employees.organizationId, organizationId)))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Employee not found" } }, 404);
  }

  return c.json({ success: true, data: updated });
});

// Reactivate employee
employeesRoutes.post("/:id/reactivate", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [updated] = await db
    .update(employees)
    .set({ status: "active", updatedAt: new Date() })
    .where(and(eq(employees.id, id), eq(employees.organizationId, organizationId)))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Employee not found" } }, 404);
  }

  return c.json({ success: true, data: updated });
});

export { employeesRoutes };
