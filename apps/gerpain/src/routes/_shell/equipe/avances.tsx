import { createFileRoute } from '@tanstack/react-router'

import { AvancesView } from '#/views/equipe/AvancesView'

export const Route = createFileRoute('/_shell/equipe/avances')({
  component: AvancesRoute,
})

function AvancesRoute() {
  return <AvancesView />
}
