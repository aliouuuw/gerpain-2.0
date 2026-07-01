import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PaieView } from '#/views/equipe/PaieView'

const paieSearchSchema = z.object({
  period: z.enum(['week', 'month', 'last15', 'custom']).optional(),
  start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  runId: z.string().uuid().optional(),
})

export const Route = createFileRoute('/_shell/equipe/paie')({
  validateSearch: paieSearchSchema,
  component: PaieRoute,
})

function PaieRoute() {
  return <PaieView />
}
