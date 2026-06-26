import { createFileRoute } from '@tanstack/react-router'

import { ProductsSettings } from '#/components/settings/ProductsSettings'

export const Route = createFileRoute('/_shell/reglages/produits')({
  component: ProductsSettings,
})
