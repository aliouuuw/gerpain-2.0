import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { FicheAgentView } from '#/views/equipe/FicheAgentView'

const ficheSearchSchema = z.object({
  tab: z
    .enum(['profil', 'remuneration', 'avances', 'conges', 'activite'])
    .optional(),
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

export const Route = createFileRoute('/_shell/equipe/agents/$employeeId')({
  validateSearch: ficheSearchSchema,
  component: FicheAgentView,
})
