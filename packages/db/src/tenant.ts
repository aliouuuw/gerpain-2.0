import { and, eq } from 'drizzle-orm'

import { db } from './client'
import { member, organizations } from './schema/index'

type OrgSettings = {
  betterAuthOrganizationId?: string
}

export async function verifyBaMembership(
  baOrganizationId: string,
  userId: string,
) {
  return db.query.member.findFirst({
    where: and(
      eq(member.organizationId, baOrganizationId),
      eq(member.userId, userId),
    ),
  })
}

/** Maps a Better Auth org id to the legacy `organizations` UUID used by domain tables. */
export async function legacyOrganizationIdForBaOrg(
  baOrganizationId: string,
): Promise<string | null> {
  const rows = await db.select().from(organizations)

  for (const org of rows) {
    if (!org.settings) continue
    try {
      const settings = JSON.parse(org.settings) as OrgSettings
      if (settings.betterAuthOrganizationId === baOrganizationId) {
        return org.id
      }
    } catch {
      continue
    }
  }

  return null
}
