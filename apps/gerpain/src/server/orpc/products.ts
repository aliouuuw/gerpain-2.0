import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db } from '@gerpain/db'

import { getBakeryForOrg } from '#/services/bakeries'
import {
  createProduct,
  deactivateProduct,
  getProduct,
  listProducts,
  ProductServiceError,
  reorderProducts,
  updateProduct,
} from '#/services/products'
import { assertManagerRole } from '#/server/permissions'
import { orgContext } from './context'

const bakeryIdInput = z.object({
  bakeryId: z.string().uuid(),
})

const productFieldsSchema = z.object({
  name: z.string().min(1).max(255),
  unitPrice: z.number().int().positive(),
  categoryId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
})

function mapProductError(error: unknown): never {
  if (error instanceof ProductServiceError) {
    const status =
      error.code === 'NOT_FOUND'
        ? 'NOT_FOUND'
        : error.code === 'INVALID_CATEGORY'
          ? 'BAD_REQUEST'
          : 'BAD_REQUEST'
    throw new ORPCError(status, { message: error.message })
  }
  throw error
}

async function assertBakery(
  organizationId: string,
  bakeryId: string,
): Promise<void> {
  const bakery = await getBakeryForOrg(db, organizationId, bakeryId)
  if (!bakery) {
    throw new ORPCError('NOT_FOUND', { message: 'Boulangerie introuvable' })
  }
}

export const list = orgContext
  .input(
    bakeryIdInput.extend({
      categoryId: z.string().uuid().optional(),
      includeInactive: z.boolean().optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    return listProducts(db, context.legacyOrganizationId, input.bakeryId, {
      categoryId: input.categoryId,
      includeInactive: input.includeInactive,
    })
  })

export const get = orgContext
  .input(
    bakeryIdInput.extend({
      productId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      return await getProduct(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.productId,
      )
    } catch (error) {
      mapProductError(error)
    }
  })

export const create = orgContext
  .input(bakeryIdInput.merge(productFieldsSchema))
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const { bakeryId, ...fields } = input

    try {
      return await createProduct(
        db,
        context.legacyOrganizationId,
        bakeryId,
        fields,
      )
    } catch (error) {
      mapProductError(error)
    }
  })

export const update = orgContext
  .input(
    bakeryIdInput.extend({
      productId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      unitPrice: z.number().int().positive().optional(),
      categoryId: z.string().uuid().nullable().optional(),
      description: z.string().max(500).optional(),
      isActive: z.boolean().optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const { bakeryId, productId, categoryId, ...fields } = input

    try {
      return await updateProduct(
        db,
        context.legacyOrganizationId,
        bakeryId,
        productId,
        {
          ...fields,
          ...(categoryId !== undefined
            ? { categoryId: categoryId ?? undefined }
            : {}),
        },
      )
    } catch (error) {
      mapProductError(error)
    }
  })

export const reorder = orgContext
  .input(
    bakeryIdInput.extend({
      orderedIds: z.array(z.string().uuid()).min(1),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    await reorderProducts(
      db,
      context.legacyOrganizationId,
      input.bakeryId,
      input.orderedIds,
    )

    return { ok: true }
  })

export const deactivate = orgContext
  .input(
    bakeryIdInput.extend({
      productId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      return await deactivateProduct(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.productId,
      )
    } catch (error) {
      mapProductError(error)
    }
  })
