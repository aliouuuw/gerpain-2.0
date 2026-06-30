import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { LivraisonsView } from '#/views/LivraisonsView'

const livraisonsSearchSchema = z.object({
  run: z.string().uuid().optional(),
})

export const Route = createFileRoute('/_shell/livraisons')({
  validateSearch: livraisonsSearchSchema,
  component: LivraisonsView,
})
