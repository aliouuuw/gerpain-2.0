import { createFileRoute } from '@tanstack/react-router'

import { CongesView } from '#/views/equipe/CongesView'

export const Route = createFileRoute('/_shell/equipe/conges')({
  component: CongesView,
})
