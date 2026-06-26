import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db } from '@gerpain/db'

import {
  createCategory,
  deactivateCategory,
  getCategory,
  listCategories,
  CategoryServiceError,
  updateCategory,
} from '#/services/categories'
import { assertManagerRole } from '#/server/permissions'
import { orgContext } from './context'

function mapCategoryError(error: unknown): never {
  if (error instanceof CategoryServiceError) {
    throw new ORPCError(
      error.code === 'NOT_FOUND' ? 'NOT_FOUND' : 'BAD_REQUEST',
      { message: error.message },
    )
  }
  throw error
}

const categoryFieldsSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  color: z.string().max(32).optional(),
  sortOrder: z.number().int().optional(),
})

export const list = orgContext
  .input(
    z.object({
      includeInactive: z.boolean().optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    return listCategories(db, context.legacyOrganizationId, {
      includeInactive: input.includeInactive,
    })
  })

export const get = orgContext
  .input(z.object({ categoryId: z.string().uuid() }))
  .handler(async ({ context, input }) => {
    try {
      return await getCategory(
        db,
        context.legacyOrganizationId,
        input.categoryId,
      )
    } catch (error) {
      mapCategoryError(error)
    }
  })

export const create = orgContext
  .input(categoryFieldsSchema)
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    return createCategory(db, context.legacyOrganizationId, input)
  })

export const update = orgContext
  .input(
    categoryFieldsSchema
      .partial()
      .extend({
        categoryId: z.string().uuid(),
        isActive: z.boolean().optional(),
      }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    const { categoryId, ...fields } = input

    try {
      return await updateCategory(
        db,
        context.legacyOrganizationId,
        categoryId,
        fields,
      )
    } catch (error) {
      mapCategoryError(error)
    }
  })

export const deactivate = orgContext
  .input(z.object({ categoryId: z.string().uuid() }))
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)

    try {
      return await deactivateCategory(
        db,
        context.legacyOrganizationId,
        input.categoryId,
      )
    } catch (error) {
      mapCategoryError(error)
    }
  })
