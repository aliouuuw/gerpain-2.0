import { createFileRoute } from '@tanstack/react-router'

import { EquipePlaceholderView } from '#/views/equipe/EquipePlaceholderView'

export const Route = createFileRoute('/_shell/equipe/paie')({
  component: PaieRoute,
})

function PaieRoute() {
  return (
    <EquipePlaceholderView
      title="Paie"
      description="Clôture de période, bulletins et export PDF/CSV — disponible prochainement."
    />
  )
}
