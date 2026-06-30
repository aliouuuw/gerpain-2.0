import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/equipe/')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/equipe/annuaire',
      search,
    })
  },
})
