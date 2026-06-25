import { ORPCError, os } from '@orpc/server'

import {
  legacyOrganizationIdForBaOrg,
  verifyBaMembership,
} from '@gerpain/db'

import { auth } from '#/server/auth'
import { activeOrganizationId } from '#/server/session'

export const publicContext = os.$context<{ headers: Headers }>()

export const authedContext = publicContext.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers })

  if (!session?.user) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Connexion requise' })
  }

  return next({
    context: {
      ...context,
      session,
      user: session.user,
    },
  })
})

export const orgContext = authedContext.use(async ({ context, next }) => {
  const organizationId = activeOrganizationId(context.session)

  if (!organizationId) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Organisation active requise',
    })
  }

  const membership = await verifyBaMembership(organizationId, context.user.id)

  if (!membership) {
    throw new ORPCError('FORBIDDEN', {
      message: 'Accès organisation refusé',
    })
  }

  const legacyOrganizationId =
    await legacyOrganizationIdForBaOrg(organizationId)

  if (!legacyOrganizationId) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Organisation métier introuvable',
    })
  }

  return next({
    context: {
      ...context,
      organizationId,
      legacyOrganizationId,
      memberRole: membership.role,
    },
  })
})
