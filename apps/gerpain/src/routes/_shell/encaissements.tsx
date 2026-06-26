import { createFileRoute } from '@tanstack/react-router'

import { EncaissementsView } from '#/views/EncaissementsView'

export const Route = createFileRoute('/_shell/encaissements')({
  component: EncaissementsView,
})
