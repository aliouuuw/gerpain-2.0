import { ORPCError, os } from '@orpc/server'
import { and, eq } from 'drizzle-orm'

import { db, member } from '@gerpain/db'

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

  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, organizationId),
      eq(member.userId, context.user.id),
    ),
  })

  if (!membership) {
    throw new ORPCError('FORBIDDEN', {
      message: 'Accès organisation refusé',
    })
  }

  return next({
    context: {
      ...context,
      organizationId,
      memberRole: membership.role,
    },
  })
})
