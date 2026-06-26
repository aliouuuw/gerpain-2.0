import { createFileRoute } from '@tanstack/react-router'

import { EquipeView } from '#/views/EquipeView'

export const Route = createFileRoute('/_shell/equipe')({
  component: EquipeView,
})
