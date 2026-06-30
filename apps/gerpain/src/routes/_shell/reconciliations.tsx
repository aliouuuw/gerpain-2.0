import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { ReconciliationsView } from '#/views/ReconciliationsView'

const reconciliationsSearchSchema = z.object({
  period: z.enum(['week', 'month', 'last15', 'custom']).optional(),
  start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  role: z.enum(['all', 'delivery', 'cashier']).optional(),
  settled: z.enum(['all', 'unsettled', 'settled']).optional(),
})

export const Route = createFileRoute('/_shell/reconciliations')({
  validateSearch: reconciliationsSearchSchema,
  component: ReconciliationsView,
})
