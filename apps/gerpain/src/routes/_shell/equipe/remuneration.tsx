import { createFileRoute } from '@tanstack/react-router'

import { RemunerationView } from '#/views/equipe/RemunerationView'

export const Route = createFileRoute('/_shell/equipe/remuneration')({
  component: RemunerationView,
})
