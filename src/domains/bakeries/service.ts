import { Hono } from "hono";
import { db } from "../../config/database.js";
import { bakeries, organizations } from "../../shared/database/schema.js";
import { eq, and, count } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { insertBakerySchema } from "../../shared/database/schema.js";

const TIER_LIMITS = {
  base: 1,
  mid: 5,
  high: 10,
} as const;

export async function getBakeriesForOrganization(organizationId: string) {
  return await db
    .select()
    .from(bakeries)
    .where(eq(bakeries.organizationId, organizationId));
}

export async function getBakeryById(id: string, organizationId: string) {
  const [bakery] = await db
    .select()
    .from(bakeries)
    .where(and(eq(bakeries.id, id), eq(bakeries.organizationId, organizationId)));
  return bakery;
}

export async function canCreateBakery(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  // Get organization tier
  const [org] = await db
    .select({ tier: organizations.tier })
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  if (!org) {
    return { allowed: false, current: 0, limit: 0 };
  }

  const tier = org.tier as keyof typeof TIER_LIMITS;
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.base;

  // Count current bakeries
  const [result] = await db
    .select({ count: count() })
    .from(bakeries)
    .where(eq(bakeries.organizationId, organizationId));

  const current = result?.count ?? 0;

  return {
    allowed: current < limit,
    current,
    limit,
  };
}

export async function createBakery(data: {
  organizationId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  settings?: string;
}) {
  // Check tier limit
  const { allowed, current, limit } = await canCreateBakery(data.organizationId);

  if (!allowed) {
    throw new Error(`Bakery limit reached: ${current}/${limit}. Upgrade your plan to add more bakeries.`);
  }

  const [bakery] = await db.insert(bakeries).values(data).returning();
  return bakery;
}

export async function updateBakery(
  id: string,
  organizationId: string,
  data: Partial<{
    name: string;
    code: string;
    address: string;
    phone: string;
    settings: string;
    isActive: boolean;
  }>
) {
  const [updated] = await db
    .update(bakeries)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(bakeries.id, id), eq(bakeries.organizationId, organizationId)))
    .returning();

  return updated;
}

export async function deleteBakery(id: string, organizationId: string) {
  const [deleted] = await db
    .delete(bakeries)
    .where(and(eq(bakeries.id, id), eq(bakeries.organizationId, organizationId)))
    .returning();

  return deleted;
}
