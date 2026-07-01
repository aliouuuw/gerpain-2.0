import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db } from '@gerpain/db'

import { getBakeryForOrg } from '#/services/bakeries'
import {
  createEmployee,
  getEmployee,
  listEmployeeProducts,
  listEmployees,
  reorderEmployees,
  setEmployeeProducts,
  EmployeeServiceError,
  updateEmployee,
} from '#/services/employees'
import { getPeriodCommissions } from '#/services/employee-commission'
import { assertManagerRole } from '#/server/permissions'
import { orgContext } from './context'

const bakeryIdInput = z.object({
  bakeryId: z.string().uuid(),
})

const employeeRoleSchema = z.enum(['delivery', 'cashier', 'manager', 'baker'])

const employeeFieldsSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: employeeRoleSchema,
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  baseSalary: z.number().int().min(0).optional(),
  hireDate: z.string().optional(),
  locationIds: z.array(z.string().uuid()).optional(),
})

function mapEmployeeError(error: unknown): never {
  if (error instanceof EmployeeServiceError) {
    throw new ORPCError(
      error.code === 'NOT_FOUND'
        ? 'NOT_FOUND'
        : error.code === 'INVALID_LOCATION'
          ? 'BAD_REQUEST'
          : 'BAD_REQUEST',
      { message: error.message },
    )
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
      role: employeeRoleSchema.optional(),
      status: z.enum(['active', 'inactive']).optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    return listEmployees(db, context.legacyOrganizationId, input.bakeryId, {
      role: input.role,
      status: input.status,
    })
  })

export const get = orgContext
  .input(
    bakeryIdInput.extend({
      employeeId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      return await getEmployee(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.employeeId,
      )
    } catch (error) {
      mapEmployeeError(error)
    }
  })

export const create = orgContext
  .input(bakeryIdInput.merge(employeeFieldsSchema))
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const { bakeryId, ...fields } = input

    try {
      return await createEmployee(
        db,
        context.legacyOrganizationId,
        bakeryId,
        fields,
      )
    } catch (error) {
      mapEmployeeError(error)
    }
  })

export const update = orgContext
  .input(
    bakeryIdInput.extend({
      employeeId: z.string().uuid(),
      firstName: z.string().min(1).max(100).optional(),
      lastName: z.string().min(1).max(100).optional(),
      role: employeeRoleSchema.optional(),
      email: z.string().email().optional(),
      phone: z.string().max(50).optional(),
      baseSalary: z.number().int().min(0).optional(),
      hireDate: z.string().optional(),
      locationIds: z.array(z.string().uuid()).optional(),
      status: z.enum(['active', 'inactive']).optional(),
      sortOrder: z.number().int().optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const { bakeryId, employeeId, ...fields } = input

    try {
      return await updateEmployee(
        db,
        context.legacyOrganizationId,
        bakeryId,
        employeeId,
        fields,
      )
    } catch (error) {
      mapEmployeeError(error)
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

    await reorderEmployees(
      db,
      context.legacyOrganizationId,
      input.bakeryId,
      input.orderedIds,
    )

    return { ok: true }
  })

export const listProducts = orgContext
  .input(
    bakeryIdInput.extend({
      employeeId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      return await listEmployeeProducts(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.employeeId,
      )
    } catch (error) {
      mapEmployeeError(error)
    }
  })

export const setProducts = orgContext
  .input(
    bakeryIdInput.extend({
      employeeId: z.string().uuid(),
      products: z.array(
        z.object({
          productId: z.string().uuid(),
          commissionPerUnit: z.number().int().min(0).optional(),
          isActive: z.boolean().optional(),
        }),
      ),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const { bakeryId, employeeId, products: productItems } = input

    try {
      return await setEmployeeProducts(
        db,
        context.legacyOrganizationId,
        bakeryId,
        employeeId,
        productItems,
      )
    } catch (error) {
      mapEmployeeError(error)
    }
  })

const periodDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const periodCommissions = orgContext
  .input(
    bakeryIdInput.extend({
      startDate: periodDateSchema,
      endDate: periodDateSchema,
      employeeId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    return getPeriodCommissions(db, {
      organizationId: context.legacyOrganizationId,
      bakeryId: input.bakeryId,
      startDate: input.startDate,
      endDate: input.endDate,
      employeeId: input.employeeId,
    })
  })
