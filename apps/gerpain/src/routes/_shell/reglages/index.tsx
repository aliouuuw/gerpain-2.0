import { createFileRoute, redirect } from '@tanstack/react-router'

import { shellSearchSchema } from '#/lib/shell-date'

export const Route = createFileRoute('/_shell/reglages/')({
  beforeLoad: ({ search }) => {
    const parsed = shellSearchSchema.safeParse(search)
    throw redirect({
      to: '/reglages/boulangerie',
      search: parsed.success ? parsed.data : {},
    })
  },
})
