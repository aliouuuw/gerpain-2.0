import { createFileRoute } from '@tanstack/react-router'

import { LocationsSettings } from '#/components/settings/LocationsSettings'

export const Route = createFileRoute('/_shell/reglages/lieux')({
  component: LocationsSettings,
})
