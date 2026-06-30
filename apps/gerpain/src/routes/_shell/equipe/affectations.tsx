import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { AffectationsView } from '#/views/equipe/AffectationsView'

const affectationsSearchSchema = z.object({
  employee: z.string().uuid().optional(),
})

export const Route = createFileRoute('/_shell/equipe/affectations')({
  validateSearch: affectationsSearchSchema,
  component: AffectationsRoute,
})

function AffectationsRoute() {
  const { employee } = Route.useSearch()
  return <AffectationsView employeeId={employee} />
}
