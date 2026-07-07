import { createFileRoute, redirect } from '@tanstack/react-router'

import { shellSearchSchema } from '#/lib/shell-date'

export const Route = createFileRoute('/_shell/equipe/')({
  beforeLoad: ({ search }) => {
    const parsed = shellSearchSchema.safeParse(search)
    throw redirect({
      to: '/equipe/annuaire',
      search: parsed.success ? parsed.data : {},
    })
  },
})
