import { formatXof } from '#/lib/format-money'

type DeliveryItem = {
  period: string
  quantityEntrusted: number
  quantityReturned: number
  quantitySold: number
  unitPrice: number
}

type DeliveryRun = {
  id: string
  employeeName: string
  locationName: string
  employeeSortOrder: number
  status: string
  items: DeliveryItem[]
}

type CashCollection = {
  id: string
  deliveryRunId: string | null
  employeeId: string
  employeeName: string
  expectedAmount: number
  cashAmount: number
  cardAmount: number
  mobileAmount: number
  status: string
}

export function periodQty(items: DeliveryItem[], period: string): number {
  return items
    .filter((item) => item.period.toLowerCase() === period)
    .reduce((sum, item) => sum + item.quantitySold, 0)
}

export function runExpected(items: DeliveryItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.quantitySold * item.unitPrice,
    0,
  )
}

export function runEntrustedQty(items: DeliveryItem[]): number {
  return items.reduce((sum, item) => sum + item.quantityEntrusted, 0)
}

export function collectedAmount(col: {
  cashAmount: number
  cardAmount: number
  mobileAmount: number
}): number {
  return col.cashAmount + col.cardAmount + col.mobileAmount
}

export function computeDayMoneyStats(collections: CashCollection[]) {
  const expected = collections.reduce(
    (sum, col) => sum + col.expectedAmount,
    0,
  )
  const collected = collections.reduce(
    (sum, col) => sum + collectedAmount(col),
    0,
  )

  return {
    expected,
    collected,
    remaining: Math.max(0, expected - collected),
  }
}

export type HomeTask = {
  id: string
  label: string
  detail: string
  to: '/livraisons' | '/encaissements' | '/reconciliations'
  urgent: boolean
  action?: 'prepare-day'
  runId?: string
  employeeId?: string
}

export function buildHomeTasks(
  runs: DeliveryRun[],
  collections: CashCollection[],
): HomeTask[] {
  const tasks: HomeTask[] = []

  if (runs.length === 0) {
    tasks.push({
      id: 'prepare-day',
      label: 'Préparer les tournées du jour',
      detail: 'Créer une ligne par livreur actif',
      to: '/livraisons',
      urgent: true,
      action: 'prepare-day',
    })
    return tasks
  }

  const collectionByRunId = new Map<string, CashCollection>()

  for (const col of collections) {
    if (col.deliveryRunId) {
      collectionByRunId.set(col.deliveryRunId, col)
    }
  }

  for (const run of runs) {
    const expected = runExpected(run.items)
    const entrusted = runEntrustedQty(run.items)
    const collection = collectionByRunId.get(run.id)

    if (run.status === 'draft' && entrusted === 0) {
      tasks.push({
        id: `b-${run.id}`,
        label: `Compléter la tournée de ${run.employeeName}`,
        detail: 'Quantités pas encore enregistrées',
        to: '/livraisons',
        urgent: false,
        runId: run.id,
      })
    }

    if (run.status === 'draft' && entrusted > 0) {
      tasks.push({
        id: `d-${run.id}`,
        label: `Valider la livraison de ${run.employeeName}`,
        detail: `${formatXof(expected)} attendu`,
        to: '/livraisons',
        urgent: true,
        runId: run.id,
      })
    }

    if (collection?.status === 'submitted') {
      tasks.push({
        id: `c-${collection.id}`,
        label: `Valider l’encaissement de ${run.employeeName}`,
        detail: `${formatXof(collectedAmount(collection))} déclaré`,
        to: '/encaissements',
        urgent: true,
        employeeId: collection.employeeId,
      })
    }

    if (
      run.status === 'validated' &&
      collection &&
      (collection.status === 'pending' || collection.status === 'rejected') &&
      collection.expectedAmount > 0 &&
      collectedAmount(collection) === 0
    ) {
      tasks.push({
        id: `e-${collection.id}`,
        label: `Saisir l’argent de ${run.employeeName}`,
        detail: `${formatXof(collection.expectedAmount)} à encaisser`,
        to: '/encaissements',
        urgent: true,
        employeeId: collection.employeeId,
      })
    }
  }

  return tasks
}

export type AgentDayRow = {
  id: string
  name: string
  subtitle: string
  expected: number
}

export function buildAgentDayRows(
  runs: DeliveryRun[],
  collections: CashCollection[],
): AgentDayRow[] {
  const collectionByRunId = new Map<string, CashCollection>()
  for (const col of collections) {
    if (col.deliveryRunId) {
      collectionByRunId.set(col.deliveryRunId, col)
    }
  }

  return [...runs]
    .sort((a, b) => a.employeeSortOrder - b.employeeSortOrder)
    .map((run) => {
      const collection = collectionByRunId.get(run.id)
      const expected =
        collection?.expectedAmount ?? runExpected(run.items)

      return {
        id: run.id,
        name: run.employeeName,
        subtitle: run.locationName,
        expected,
      }
    })
}
