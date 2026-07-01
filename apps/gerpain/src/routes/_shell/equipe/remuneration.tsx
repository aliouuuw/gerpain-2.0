import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { RemunerationView } from '#/views/equipe/RemunerationView'

const remunerationSearchSchema = z.object({
  employee: z.string().uuid().optional(),
})

export const Route = createFileRoute('/_shell/equipe/remuneration')({
  validateSearch: remunerationSearchSchema,
  component: RemunerationRoute,
})

function RemunerationRoute() {
  const { employee } = Route.useSearch()
  return <RemunerationView employeeId={employee} />
}
