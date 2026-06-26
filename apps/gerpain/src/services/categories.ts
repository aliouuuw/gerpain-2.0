import { and, desc, eq } from 'drizzle-orm'

import { type Database, categories } from '@gerpain/db'

export class CategoryServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND',
    message: string,
  ) {
    super(message)
    this.name = 'CategoryServiceError'
  }
}

export type CategoryInput = {
  name: string
  description?: string
  color?: string
  sortOrder?: number
}

export type CategoryUpdateInput = Partial<CategoryInput> & {
  isActive?: boolean
}

export async function listCategories(
  db: Database,
  organizationId: string,
  options?: { includeInactive?: boolean },
) {
  const rows = await db.query.categories.findMany({
    where: eq(categories.organizationId, organizationId),
    orderBy: [desc(categories.sortOrder), categories.name],
  })

  if (options?.includeInactive) {
    return rows
  }

  return rows.filter((row) => row.isActive !== false)
}

export async function getCategory(
  db: Database,
  organizationId: string,
  categoryId: string,
) {
  const row = await db.query.categories.findFirst({
    where: and(
      eq(categories.id, categoryId),
      eq(categories.organizationId, organizationId),
    ),
  })

  if (!row) {
    throw new CategoryServiceError('NOT_FOUND', 'Catégorie introuvable')
  }

  return row
}

export async function createCategory(
  db: Database,
  organizationId: string,
  input: CategoryInput,
) {
  const [created] = await db
    .insert(categories)
    .values({
      organizationId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      color: input.color?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
    })
    .returning()

  return created!
}

export async function updateCategory(
  db: Database,
  organizationId: string,
  categoryId: string,
  input: CategoryUpdateInput,
) {
  await getCategory(db, organizationId, categoryId)

  const patch: Partial<typeof categories.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.description !== undefined) {
    patch.description = input.description.trim() || null
  }
  if (input.color !== undefined) patch.color = input.color.trim() || null
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder
  if (input.isActive !== undefined) patch.isActive = input.isActive

  const [updated] = await db
    .update(categories)
    .set(patch)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.organizationId, organizationId),
      ),
    )
    .returning()

  if (!updated) {
    throw new CategoryServiceError('NOT_FOUND', 'Catégorie introuvable')
  }

  return updated
}

export async function deactivateCategory(
  db: Database,
  organizationId: string,
  categoryId: string,
) {
  return updateCategory(db, organizationId, categoryId, { isActive: false })
}
