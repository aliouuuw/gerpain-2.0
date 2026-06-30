import { createFileRoute } from '@tanstack/react-router'

import { EquipePlaceholderView } from '#/views/equipe/EquipePlaceholderView'

export const Route = createFileRoute('/_shell/equipe/avances')({
  component: AvancesRoute,
})

function AvancesRoute() {
  return (
    <EquipePlaceholderView
      title="Avances sur salaire"
      description="Suivi des avances et remboursements par période — disponible prochainement."
    />
  )
}
