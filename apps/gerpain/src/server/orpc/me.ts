import { z } from 'zod'

import { isManagerRole } from '#/server/permissions'
import { authedContext, orgContext } from './context'
import { activeOrganizationId } from '#/server/session'

export const sessionInfo = authedContext
  .input(z.object({}).optional())
  .handler(async ({ context }) => ({
    user: {
      id: context.user.id,
      email: context.user.email,
      name: context.user.name,
    },
    activeOrganizationId: activeOrganizationId(context.session) ?? null,
  }))

export const access = orgContext
  .input(z.object({}).optional())
  .handler(async ({ context }) => ({
    memberRole: context.memberRole,
    canManageCollections: isManagerRole(context.memberRole),
  }))
