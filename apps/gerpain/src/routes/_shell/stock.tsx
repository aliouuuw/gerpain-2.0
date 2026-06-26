import { createFileRoute } from '@tanstack/react-router'

import { StockView } from '#/views/StockView'

export const Route = createFileRoute('/_shell/stock')({
  component: StockView,
})
