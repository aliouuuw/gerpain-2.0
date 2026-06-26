import { createFileRoute } from '@tanstack/react-router'

import { BakerySettings } from '#/components/settings/BakerySettings'

export const Route = createFileRoute('/_shell/reglages/boulangerie')({
  component: BakerySettings,
})
