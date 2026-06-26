import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { EncaissementsView } from '#/views/EncaissementsView'

const encaissementsSearchSchema = z.object({
  employee: z.string().optional(),
  period: z.enum(['week', 'month', 'last15', 'custom']).optional(),
  start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const Route = createFileRoute('/_shell/encaissements')({
  validateSearch: encaissementsSearchSchema,
  component: EncaissementsView,
})
