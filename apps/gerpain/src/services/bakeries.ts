import { and, eq } from 'drizzle-orm'

import { type Database, bakeries } from '@gerpain/db'

import {
  parseBakerySettings,
  serializeBakerySettings,
  type BakerySettings,
} from '#/lib/bakery-settings'

export class BakeryServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND',
    message: string,
  ) {
    super(message)
    this.name = 'BakeryServiceError'
  }
}

export type BakeryDetail = {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  settings: BakerySettings
}

export type BakeryUpdateInput = {
  name?: string
  address?: string | null
  phone?: string | null
  settings?: BakerySettings
}

function toBakeryDetail(row: typeof bakeries.$inferSelect): BakeryDetail {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: row.address,
    phone: row.phone,
    settings: parseBakerySettings(row.settings),
  }
}

export async function listBakeries(
  db: Database,
  organizationId: string,
): Promise<BakeryDetail[]> {
  const rows = await db.query.bakeries.findMany({
    where: and(
      eq(bakeries.organizationId, organizationId),
      eq(bakeries.isActive, true),
    ),
    orderBy: (table, { asc }) => [asc(table.name)],
  })
  return rows.map(toBakeryDetail)
}

export async function getBakeryForOrg(
  db: Database,
  organizationId: string,
  bakeryId: string,
): Promise<BakeryDetail | undefined> {
  const row = await db.query.bakeries.findFirst({
    where: and(
      eq(bakeries.id, bakeryId),
      eq(bakeries.organizationId, organizationId),
    ),
  })
  return row ? toBakeryDetail(row) : undefined
}

export async function updateBakery(
  db: Database,
  organizationId: string,
  bakeryId: string,
  input: BakeryUpdateInput,
): Promise<BakeryDetail> {
  const current = await getBakeryForOrg(db, organizationId, bakeryId)
  if (!current) {
    throw new BakeryServiceError('NOT_FOUND', 'Boulangerie introuvable')
  }

  const patch: Partial<typeof bakeries.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.address !== undefined) {
    patch.address = input.address?.trim() || null
  }
  if (input.phone !== undefined) {
    patch.phone = input.phone?.trim() || null
  }
  if (input.settings !== undefined) {
    patch.settings = serializeBakerySettings({
      ...current.settings,
      ...input.settings,
    })
  }

  const [updated] = await db
    .update(bakeries)
    .set(patch)
    .where(
      and(
        eq(bakeries.id, bakeryId),
        eq(bakeries.organizationId, organizationId),
      ),
    )
    .returning()

  if (!updated) {
    throw new BakeryServiceError('NOT_FOUND', 'Boulangerie introuvable')
  }

  return toBakeryDetail(updated)
}
