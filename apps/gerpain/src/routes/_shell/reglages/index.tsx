import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/reglages/')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/reglages/boulangerie',
      search,
    })
  },
})
