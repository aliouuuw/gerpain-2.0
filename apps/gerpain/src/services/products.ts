import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm'

import { type Database, products } from '@gerpain/db'

import { getCategory } from '#/services/categories'

export class ProductServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'INVALID_CATEGORY',
    message: string,
  ) {
    super(message)
    this.name = 'ProductServiceError'
  }
}

export type ProductInput = {
  name: string
  unitPrice: number
  categoryId?: string
  description?: string
}

export type ProductUpdateInput = Partial<ProductInput> & {
  isActive?: boolean
}

export type ProductListItem = {
  id: string
  name: string
  unitPrice: number
  description: string | null
  sortOrder: number | null
  isActive: boolean | null
  bakeryId: string | null
  categoryId: string | null
  categoryName: string | null
}

function bakeryScope(organizationId: string, bakeryId: string) {
  return and(
    eq(products.organizationId, organizationId),
    or(isNull(products.bakeryId), eq(products.bakeryId, bakeryId)),
  )
}

export async function listProducts(
  db: Database,
  organizationId: string,
  bakeryId: string,
  options?: { categoryId?: string; includeInactive?: boolean },
): Promise<ProductListItem[]> {
  const rows = await db.query.products.findMany({
    where: bakeryScope(organizationId, bakeryId),
    with: { category: true },
    orderBy: [asc(products.sortOrder), asc(products.name)],
  })

  let filtered = rows
  if (options?.categoryId) {
    filtered = filtered.filter((row) => row.categoryId === options.categoryId)
  }
  if (!options?.includeInactive) {
    filtered = filtered.filter((row) => row.isActive !== false)
  }

  return filtered.map((row) => ({
    id: row.id,
    name: row.name,
    unitPrice: row.unitPrice,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    bakeryId: row.bakeryId,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
  }))
}

export async function getProduct(
  db: Database,
  organizationId: string,
  bakeryId: string,
  productId: string,
) {
  const row = await db.query.products.findFirst({
    where: and(eq(products.id, productId), bakeryScope(organizationId, bakeryId)),
    with: { category: true },
  })

  if (!row) {
    throw new ProductServiceError('NOT_FOUND', 'Produit introuvable')
  }

  return {
    id: row.id,
    name: row.name,
    unitPrice: row.unitPrice,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    bakeryId: row.bakeryId,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
  }
}

async function assertCategoryForOrg(
  db: Database,
  organizationId: string,
  categoryId: string | undefined,
) {
  if (!categoryId) return
  try {
    await getCategory(db, organizationId, categoryId)
  } catch {
    throw new ProductServiceError('INVALID_CATEGORY', 'Catégorie introuvable')
  }
}

export async function createProduct(
  db: Database,
  organizationId: string,
  bakeryId: string,
  input: ProductInput,
) {
  await assertCategoryForOrg(db, organizationId, input.categoryId)

  const [created] = await db
    .insert(products)
    .values({
      organizationId,
      bakeryId,
      name: input.name.trim(),
      unitPrice: input.unitPrice,
      categoryId: input.categoryId ?? null,
      description: input.description?.trim() || null,
      isActive: true,
    })
    .returning()

  return getProduct(db, organizationId, bakeryId, created!.id)
}

export async function updateProduct(
  db: Database,
  organizationId: string,
  bakeryId: string,
  productId: string,
  input: ProductUpdateInput,
) {
  await getProduct(db, organizationId, bakeryId, productId)
  if (input.categoryId !== undefined) {
    await assertCategoryForOrg(db, organizationId, input.categoryId)
  }

  const patch: Partial<typeof products.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.unitPrice !== undefined) patch.unitPrice = input.unitPrice
  if (input.categoryId !== undefined) patch.categoryId = input.categoryId ?? null
  if (input.description !== undefined) {
    patch.description = input.description.trim() || null
  }
  if (input.isActive !== undefined) patch.isActive = input.isActive

  const [updated] = await db
    .update(products)
    .set(patch)
    .where(
      and(
        eq(products.id, productId),
        eq(products.organizationId, organizationId),
      ),
    )
    .returning()

  if (!updated) {
    throw new ProductServiceError('NOT_FOUND', 'Produit introuvable')
  }

  return getProduct(db, organizationId, bakeryId, productId)
}

export async function deactivateProduct(
  db: Database,
  organizationId: string,
  bakeryId: string,
  productId: string,
) {
  return updateProduct(db, organizationId, bakeryId, productId, {
    isActive: false,
  })
}

export async function reorderProducts(
  db: Database,
  organizationId: string,
  bakeryId: string,
  orderedIds: string[],
): Promise<void> {
  if (orderedIds.length === 0) return

  await db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          inArray(products.id, orderedIds),
          eq(products.organizationId, organizationId),
          or(isNull(products.bakeryId), eq(products.bakeryId, bakeryId)),
        ),
      )

    const ownedIds = new Set(owned.map((row) => row.id))
    const now = new Date()

    let position = 0
    for (const id of orderedIds) {
      if (!ownedIds.has(id)) continue
      await tx
        .update(products)
        .set({ sortOrder: position, updatedAt: now })
        .where(
          and(
            eq(products.id, id),
            eq(products.organizationId, organizationId),
          ),
        )
      position += 1
    }
  })
}
