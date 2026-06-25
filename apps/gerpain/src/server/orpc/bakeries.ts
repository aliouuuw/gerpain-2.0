import { z } from 'zod'

import { db } from '@gerpain/db'

import { listBakeries } from '#/services/bakeries'
import { orgContext } from './context'

export const list = orgContext.input(z.object({}).optional()).handler(
  async ({ context }) => {
    const rows = await listBakeries(db, context.legacyOrganizationId)
    return rows.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      address: b.address,
      phone: b.phone,
    }))
  },
)
