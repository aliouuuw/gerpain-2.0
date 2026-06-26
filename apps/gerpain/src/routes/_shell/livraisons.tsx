import { createFileRoute } from '@tanstack/react-router'

import { LivraisonsView } from '#/views/LivraisonsView'

export const Route = createFileRoute('/_shell/livraisons')({
  component: LivraisonsView,
})
