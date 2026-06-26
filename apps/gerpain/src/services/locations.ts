import { and, eq } from 'drizzle-orm'

import { type Database, locations } from '@gerpain/db'

export class LocationServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND',
    message: string,
  ) {
    super(message)
    this.name = 'LocationServiceError'
  }
}

export type LocationInput = {
  name: string
  type: 'shop' | 'warehouse'
  address?: string
  phone?: string
}

export type LocationUpdateInput = Partial<LocationInput> & {
  isActive?: boolean
}

export async function listLocations(
  db: Database,
  organizationId: string,
  bakeryId: string,
  options?: { includeInactive?: boolean },
) {
  const rows = await db.query.locations.findMany({
    where: and(
      eq(locations.organizationId, organizationId),
      eq(locations.bakeryId, bakeryId),
    ),
    orderBy: (table, { asc }) => [asc(table.name)],
  })

  if (options?.includeInactive) {
    return rows
  }

  return rows.filter((row) => row.isActive !== false)
}

export async function getLocation(
  db: Database,
  organizationId: string,
  bakeryId: string,
  locationId: string,
) {
  const row = await db.query.locations.findFirst({
    where: and(
      eq(locations.id, locationId),
      eq(locations.organizationId, organizationId),
      eq(locations.bakeryId, bakeryId),
    ),
  })

  if (!row) {
    throw new LocationServiceError('NOT_FOUND', 'Lieu introuvable')
  }

  return row
}

export async function createLocation(
  db: Database,
  organizationId: string,
  bakeryId: string,
  input: LocationInput,
) {
  const [created] = await db
    .insert(locations)
    .values({
      organizationId,
      bakeryId,
      name: input.name.trim(),
      type: input.type,
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      isActive: true,
    })
    .returning()

  return created!
}

export async function updateLocation(
  db: Database,
  organizationId: string,
  bakeryId: string,
  locationId: string,
  input: LocationUpdateInput,
) {
  await getLocation(db, organizationId, bakeryId, locationId)

  const patch: Partial<typeof locations.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.type !== undefined) patch.type = input.type
  if (input.address !== undefined) {
    patch.address = input.address.trim() || null
  }
  if (input.phone !== undefined) patch.phone = input.phone.trim() || null
  if (input.isActive !== undefined) patch.isActive = input.isActive

  const [updated] = await db
    .update(locations)
    .set(patch)
    .where(
      and(
        eq(locations.id, locationId),
        eq(locations.organizationId, organizationId),
        eq(locations.bakeryId, bakeryId),
      ),
    )
    .returning()

  if (!updated) {
    throw new LocationServiceError('NOT_FOUND', 'Lieu introuvable')
  }

  return updated
}

export async function deactivateLocation(
  db: Database,
  organizationId: string,
  bakeryId: string,
  locationId: string,
) {
  return updateLocation(db, organizationId, bakeryId, locationId, {
    isActive: false,
  })
}
