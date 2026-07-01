import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { RemunerationView } from '#/views/equipe/RemunerationView'

const remunerationSearchSchema = z.object({
  employee: z.string().uuid().optional(),
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

export const Route = createFileRoute('/_shell/equipe/remuneration')({
  validateSearch: remunerationSearchSchema,
  component: RemunerationRoute,
})

function RemunerationRoute() {
  const search = Route.useSearch()
  return <RemunerationView employeeId={search.employee} />
}
