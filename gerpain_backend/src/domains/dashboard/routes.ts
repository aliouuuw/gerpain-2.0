import { Hono } from "hono";
import { db } from "../../config/database.js";
import { 
  deliveryRuns, 
  deliveryItems,
  cashCollections, 
  employees,
  products
} from "../../shared/database/schema.js";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { cache, CacheNamespace, CacheTTL } from "../../config/redis.js";

const dashboardRoutes = new Hono();

// Get dashboard summary for a date (defaults to today)
dashboardRoutes.get("/summary", async (c) => {
  const organizationId = c.req.header("X-Organization-ID");
  const bakeryId = c.req.header("X-Bakery-ID");
  const dateParam = c.req.query("date");
  
  if (!organizationId) {
    return c.json({ success: false, error: { code: "MISSING_ORG", message: "Organization ID required" } }, 400);
  }

  // Default to today
  const date = dateParam || new Date().toISOString().split("T")[0];
  const cacheKey = `${organizationId}:${bakeryId || 'all'}:${date}`;

  // Use getOrSet for caching
  const { data: summary, cached } = await cache.getOrSet(
    CacheNamespace.DASHBOARD,
    cacheKey,
    async () => {
      // Build base conditions
      const orgCondition = eq(deliveryRuns.organizationId, organizationId);
      const dateCondition = eq(deliveryRuns.date, date);
      
      // 1. Get delivery runs for today
      const runsQuery = bakeryId
        ? and(orgCondition, eq(deliveryRuns.bakeryId, bakeryId), dateCondition)
        : and(orgCondition, dateCondition);
      
      const todayRuns = await db.select().from(deliveryRuns).where(runsQuery!);
      
      const totalRuns = todayRuns.length;
      const validatedRuns = todayRuns.filter(r => r.status === "validated").length;
      const draftRuns = todayRuns.filter(r => r.status === "draft").length;

      // 2. Calculate today's revenue from validated deliveries
      const validatedRunIds = todayRuns.filter(r => r.status === "validated").map(r => r.id);
      let todayRevenue = 0;
      
      if (validatedRunIds.length > 0) {
        const items = await db.select().from(deliveryItems).where(inArray(deliveryItems.runId, validatedRunIds));
        todayRevenue = items.reduce((sum, item) => {
          const sold = item.quantityEntrusted - item.quantityReturned;
          return sum + (sold * item.unitPrice);
        }, 0);
      }

      // 3. Get collection status
      const collectionsOrgCondition = eq(cashCollections.organizationId, organizationId);
      const collectionsDateCondition = eq(cashCollections.date, date);
      
      const collectionsQuery = bakeryId
        ? and(collectionsOrgCondition, eq(cashCollections.bakeryId, bakeryId), collectionsDateCondition)
        : and(collectionsOrgCondition, collectionsDateCondition);
      
      const todayCollections = await db.select().from(cashCollections).where(collectionsQuery!);
      
      const pendingCollections = todayCollections.filter(c => c.status === "pending").length;
      const submittedCollections = todayCollections.filter(c => c.status === "submitted").length;
      const validatedCollections = todayCollections.filter(c => c.status === "validated").length;
      const totalCollected = todayCollections.reduce((sum, c) => sum + (c.actualAmount || 0), 0);
      const totalExpected = todayCollections.reduce((sum, c) => sum + c.expectedAmount, 0);

      // 4. Get outstanding balance (all unsettled collections, not just today)
      const unsettledCondition = bakeryId
        ? and(collectionsOrgCondition, eq(cashCollections.bakeryId, bakeryId), eq(cashCollections.isSettled, false))
        : and(collectionsOrgCondition, eq(cashCollections.isSettled, false));
      
      const unsettledCollections = await db.select().from(cashCollections).where(unsettledCondition!);
      const outstandingBalance = unsettledCollections.reduce((sum, c) => {
        return sum + (c.expectedAmount - (c.actualAmount || 0));
      }, 0);

      // 5. Get recent activity (last 10 validated deliveries + collections)
      const recentRuns = await db
        .select()
        .from(deliveryRuns)
        .where(
          bakeryId
            ? and(orgCondition, eq(deliveryRuns.bakeryId, bakeryId), eq(deliveryRuns.status, "validated"))
            : and(orgCondition, eq(deliveryRuns.status, "validated"))
        )
        .orderBy(desc(deliveryRuns.validatedAt))
        .limit(5);

      const recentCollectionsData = await db
        .select()
        .from(cashCollections)
        .where(
          bakeryId
            ? and(collectionsOrgCondition, eq(cashCollections.bakeryId, bakeryId))
            : collectionsOrgCondition
        )
        .orderBy(desc(cashCollections.updatedAt))
        .limit(5);

      // Get employee names for recent activity
      const employeeIds = [...new Set([
        ...recentRuns.map(r => r.employeeId),
        ...recentCollectionsData.map(c => c.employeeId)
      ])];
      
      const employeeRows = employeeIds.length > 0
        ? await db.select().from(employees).where(inArray(employees.id, employeeIds))
        : [];
      const employeeMap = new Map(employeeRows.map(e => [e.id, `${e.firstName} ${e.lastName}`]));

      const recentActivity = [
        ...recentRuns.map(r => ({
          type: "delivery_validated" as const,
          label: `Livraison validée – ${employeeMap.get(r.employeeId) || 'Inconnu'}`,
          time: r.validatedAt?.toISOString() || r.updatedAt?.toISOString() || "",
          status: "success" as const,
        })),
        ...recentCollectionsData.map(c => ({
          type: "collection" as const,
          label: c.status === "pending" 
            ? `Collecte en attente – ${employeeMap.get(c.employeeId) || 'Inconnu'}`
            : c.status === "validated"
            ? `Collecte validée – ${employeeMap.get(c.employeeId) || 'Inconnu'}`
            : `Collecte – ${employeeMap.get(c.employeeId) || 'Inconnu'}`,
          time: c.updatedAt?.toISOString() || "",
          status: c.status === "validated" ? "success" as const : c.status === "pending" ? "pending" as const : "info" as const,
        })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

      // 6. Generate alerts
      const alerts: Array<{ label: string; severity: "urgent" | "warning" | "info" }> = [];

      if (pendingCollections > 0) {
        alerts.push({
          label: `${pendingCollections} collecte${pendingCollections > 1 ? 's' : ''} en attente de validation`,
          severity: pendingCollections > 5 ? "urgent" : "warning",
        });
      }

      if (outstandingBalance > 50000) {
        alerts.push({
          label: `Solde impayé: ${outstandingBalance.toLocaleString('fr-FR')} FCFA`,
          severity: outstandingBalance > 200000 ? "urgent" : "warning",
        });
      }

      if (draftRuns > 0) {
        alerts.push({
          label: `${draftRuns} tournée${draftRuns > 1 ? 's' : ''} non validée${draftRuns > 1 ? 's' : ''}`,
          severity: "info",
        });
      }

      return {
        date,
        stats: {
          todayRevenue,
          deliveries: {
            total: totalRuns,
            validated: validatedRuns,
            draft: draftRuns,
          },
          collections: {
            pending: pendingCollections,
            submitted: submittedCollections,
            validated: validatedCollections,
            totalCollected,
            totalExpected,
          },
          outstandingBalance,
        },
        recentActivity,
        alerts,
      };
    },
    CacheTTL.SHORT // 30 seconds - dashboard data changes frequently
  );

  return c.json({
    success: true,
    data: summary,
    cached,
  });
});

export { dashboardRoutes };
