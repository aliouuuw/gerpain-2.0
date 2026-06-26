import { createFileRoute } from '@tanstack/react-router'

import { ReglagesView } from '#/views/ReglagesView'

export const Route = createFileRoute('/_shell/reglages')({
  component: ReglagesView,
})
