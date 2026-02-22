import { Hono } from "hono";
import { db } from "../../config/database.js";
import { employees, employeeLocations, employeeProducts, insertEmployeeSchema, insertEmployeeProductSchema } from "../../shared/database/schema.js";
import { eq, and, asc, sql, inArray } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { cache, CacheNamespace, CacheTTL } from "../../config/redis.js";

const employeesRoutes = new Hono();

// List employees
employeesRoutes.get("/", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const bakeryId = c.req.header("X-Bakery-ID");
  const role = c.req.query("role");
  const status = c.req.query("status");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  // Build WHERE conditions dynamically to push filters to SQL
  const conditions = [eq(employees.organizationId, organizationId)];
  
  if (bakeryId) {
    conditions.push(eq(employees.bakeryId, bakeryId));
  }
  if (role) {
    conditions.push(eq(employees.role, role));
  }
  if (status) {
    conditions.push(eq(employees.status, status));
  }

  const filtered = await db
    .select()
    .from(employees)
    .where(and(...conditions))
    .orderBy(asc(employees.sortOrder), asc(employees.hireDate));

  // Batch fetch all locations for filtered employees (fixes N+1)
  const employeeIds = filtered.map(e => e.id);
  const allLocations = employeeIds.length > 0
    ? await db.select().from(employeeLocations).where(inArray(employeeLocations.employeeId, employeeIds))
    : [];
  
  // Group locations by employee ID
  const locationsByEmployee = new Map<string, string[]>();
  for (const loc of allLocations) {
    if (!locationsByEmployee.has(loc.employeeId)) {
      locationsByEmployee.set(loc.employeeId, []);
    }
    locationsByEmployee.get(loc.employeeId)!.push(loc.locationId);
  }

  // Combine employees with their locations
  const employeesWithLocations = filtered.map(emp => ({
    ...emp,
    locations: locationsByEmployee.get(emp.id) || [],
  }));

  return c.json({ success: true, data: employeesWithLocations });
});

// Reorder employees - batch update sortOrder
employeesRoutes.put(
  "/reorder",
  zValidator(
    "json",
    z.object({
      order: z.array(z.object({ id: z.string(), sortOrder: z.number() })),
    })
  ),
  async (c) => {
    const organizationId = c.req.header("X-Organization-ID");
    const { order } = c.req.valid("json");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    const ids = order.map(o => o.id);

    await db.transaction(async (tx) => {
      const caseExpr = sql.join(
        order.map((o) => sql`WHEN ${o.id} THEN ${o.sortOrder}`),
        sql` `
      );
      await tx
        .update(employees)
        .set({
          sortOrder: sql`(CASE ${employees.id} ${caseExpr} ELSE ${employees.sortOrder} END)::int`,
          updatedAt: new Date(),
        })
        .where(and(inArray(employees.id, ids), eq(employees.organizationId, organizationId)));
    });

    // Invalidate employee cache
    await cache.invalidate(CacheNamespace.EMPLOYEES);

    return c.json({ success: true, data: { ok: true } });
  }
);

// Get single employee
employeesRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");
  const bakeryId = c.req.header("X-Bakery-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [employee] = await db
    .select()
    .from(employees)
    .where(
      bakeryId
        ? and(eq(employees.id, id), eq(employees.organizationId, organizationId), eq(employees.bakeryId, bakeryId))!
        : and(eq(employees.id, id), eq(employees.organizationId, organizationId))!
    );

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

    // Invalidate employee cache
    await cache.invalidate(CacheNamespace.EMPLOYEES);

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
    const bakeryId = c.req.header("X-Bakery-ID");
    const { locations: locationIds, ...employeeData } = c.req.valid("json");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    const [updated] = await db
      .update(employees)
      .set({ ...employeeData, updatedAt: new Date() })
      .where(
        bakeryId
          ? and(eq(employees.id, id), eq(employees.organizationId, organizationId), eq(employees.bakeryId, bakeryId))!
          : and(eq(employees.id, id), eq(employees.organizationId, organizationId))!
      )
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

    // Invalidate employee cache
    await cache.invalidate(CacheNamespace.EMPLOYEES);

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
  const bakeryId = c.req.header("X-Bakery-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [updated] = await db
    .update(employees)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(
      bakeryId
        ? and(eq(employees.id, id), eq(employees.organizationId, organizationId), eq(employees.bakeryId, bakeryId))!
        : and(eq(employees.id, id), eq(employees.organizationId, organizationId))!
    )
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Employee not found" } }, 404);
  }

  // Invalidate employee cache
  await cache.invalidate(CacheNamespace.EMPLOYEES);

  return c.json({ success: true, data: updated });
});

// Reactivate employee
employeesRoutes.post("/:id/reactivate", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");
  const bakeryId = c.req.header("X-Bakery-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  const [updated] = await db
    .update(employees)
    .set({ status: "active", updatedAt: new Date() })
    .where(
      bakeryId
        ? and(eq(employees.id, id), eq(employees.organizationId, organizationId), eq(employees.bakeryId, bakeryId))!
        : and(eq(employees.id, id), eq(employees.organizationId, organizationId))!
    )
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Employee not found" } }, 404);
  }

  // Invalidate employee cache
  await cache.invalidate(CacheNamespace.EMPLOYEES);

  return c.json({ success: true, data: updated });
});

// Get employee product assignments
employeesRoutes.get("/:id/products", async (c) => {
  const id = c.req.param("id");
  const organizationId = c.req.header("X-Organization-ID");
  const bakeryId = c.req.header("X-Bakery-ID");

  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  // Verify employee exists and belongs to org/bakery
  const [employee] = await db
    .select()
    .from(employees)
    .where(
      bakeryId
        ? and(eq(employees.id, id), eq(employees.organizationId, organizationId), eq(employees.bakeryId, bakeryId))!
        : and(eq(employees.id, id), eq(employees.organizationId, organizationId))!
    );

  if (!employee) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Employee not found" } }, 404);
  }

  // Get product assignments with product details
  const assignments = await db
    .select({
      id: employeeProducts.id,
      employeeId: employeeProducts.employeeId,
      productId: employeeProducts.productId,
      commissionPerUnit: employeeProducts.commissionPerUnit,
      isActive: employeeProducts.isActive,
      createdAt: employeeProducts.createdAt,
      updatedAt: employeeProducts.updatedAt,
    })
    .from(employeeProducts)
    .where(eq(employeeProducts.employeeId, id));

  return c.json({ success: true, data: assignments });
});

// Update employee product assignments (bulk upsert)
const updateEmployeeProductsSchema = z.object({
  products: z.array(z.object({
    productId: z.string().uuid(),
    commissionPerUnit: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
  })),
});

employeesRoutes.put(
  "/:id/products",
  zValidator("json", updateEmployeeProductsSchema),
  async (c) => {
    const id = c.req.param("id");
    const organizationId = c.req.header("X-Organization-ID");
    const bakeryId = c.req.header("X-Bakery-ID");

    if (!organizationId) {
      return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
    }

    // Verify employee exists and belongs to org/bakery
    const [employee] = await db
      .select()
      .from(employees)
      .where(
        bakeryId
          ? and(eq(employees.id, id), eq(employees.organizationId, organizationId), eq(employees.bakeryId, bakeryId))!
          : and(eq(employees.id, id), eq(employees.organizationId, organizationId))!
      );

    if (!employee) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Employee not found" } }, 404);
    }

    const { products } = c.req.valid("json");

    // Delete existing assignments
    await db.delete(employeeProducts).where(eq(employeeProducts.employeeId, id));

    // Insert new assignments
    if (products.length > 0) {
      await db.insert(employeeProducts).values(
        products.map((p) => ({
          employeeId: id,
          productId: p.productId,
          commissionPerUnit: p.commissionPerUnit,
          isActive: p.isActive,
        }))
      );
    }

    // Return updated assignments
    const assignments = await db
      .select()
      .from(employeeProducts)
      .where(eq(employeeProducts.employeeId, id));

    return c.json({ success: true, data: assignments });
  }
);

export { employeesRoutes };
