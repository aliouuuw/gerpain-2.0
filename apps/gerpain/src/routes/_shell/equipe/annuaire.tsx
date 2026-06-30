import { createFileRoute } from '@tanstack/react-router'

import { AnnuaireView } from '#/views/equipe/AnnuaireView'

export const Route = createFileRoute('/_shell/equipe/annuaire')({
  component: AnnuaireView,
})
