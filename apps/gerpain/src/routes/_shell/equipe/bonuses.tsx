import { createFileRoute } from '@tanstack/react-router'

import { BonusesView } from '#/views/equipe/BonusesView'

export const Route = createFileRoute('/_shell/equipe/bonuses')({
  component: BonusesRoute,
})

function BonusesRoute() {
  return <BonusesView />
}
