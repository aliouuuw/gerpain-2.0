import { and, eq } from 'drizzle-orm'

import { type Database, bakeries } from '@gerpain/db'

export async function listBakeries(db: Database, organizationId: string) {
  return db.query.bakeries.findMany({
    where: and(
      eq(bakeries.organizationId, organizationId),
      eq(bakeries.isActive, true),
    ),
    orderBy: (table, { asc }) => [asc(table.name)],
  })
}

export async function getBakeryForOrg(
  db: Database,
  organizationId: string,
  bakeryId: string,
) {
  return db.query.bakeries.findFirst({
    where: and(
      eq(bakeries.id, bakeryId),
      eq(bakeries.organizationId, organizationId),
    ),
  })
}
