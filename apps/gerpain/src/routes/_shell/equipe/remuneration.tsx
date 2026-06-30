import { createFileRoute } from '@tanstack/react-router'

import { EquipePlaceholderView } from '#/views/equipe/EquipePlaceholderView'

export const Route = createFileRoute('/_shell/equipe/remuneration')({
  component: RemunerationRoute,
})

function RemunerationRoute() {
  return (
    <EquipePlaceholderView
      title="Rémunération"
      description="Configuration du salaire de base, des grilles de commission et des primes — disponible prochainement."
    />
  )
}
