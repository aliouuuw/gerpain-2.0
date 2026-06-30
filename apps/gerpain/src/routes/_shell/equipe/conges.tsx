import { createFileRoute } from '@tanstack/react-router'

import { EquipePlaceholderView } from '#/views/equipe/EquipePlaceholderView'

export const Route = createFileRoute('/_shell/equipe/conges')({
  component: CongesRoute,
})

function CongesRoute() {
  return (
    <EquipePlaceholderView
      title="Congés"
      description="Demandes d'absence, validation et blocage des tournées — disponible prochainement."
    />
  )
}
