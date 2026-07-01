import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

const affectationsSearchSchema = z.object({
  employee: z.string().uuid().optional(),
})

export const Route = createFileRoute('/_shell/equipe/affectations')({
  validateSearch: affectationsSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/equipe/remuneration',
      search: search.employee ? { employee: search.employee } : {},
    })
  },
})
