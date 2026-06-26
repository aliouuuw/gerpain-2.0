export type DeliveryStatus = 'Brouillon' | 'À valider' | 'Validé'
export type CollectionStatus = 'En attente' | 'Soumis' | 'Validé' | 'Rejeté'

export interface Agent {
  id: number
  name: string
  role: string
  phone: string
  initials: string
}

export interface AgentDaySummary {
  agentId: number
  agent: string
  role: string
  initials: string
  expected: number
  collected: number
  deliveryStatus: DeliveryStatus
  collectionStatus: CollectionStatus
  matinQty: number
  soirQty: number
  hasCollection: boolean
}

export interface StockLine {
  id: number
  product: string
  unit: string
  qty: number
  minStock: number
  location: string
}

export const bakery = {
  name: 'Boulangerie Centrale',
  code: 'BC',
  location: 'Dépôt Principal',
}

export const agents: Agent[] = [
  { id: 1, name: 'Ali Konaté', role: 'Livreur', phone: '+221 77 100 00 01', initials: 'AK' },
  { id: 2, name: 'Amina Diallo', role: 'Livreure', phone: '+221 77 100 00 02', initials: 'AD' },
  { id: 3, name: 'Moussa Traoré', role: 'Livreur', phone: '+221 77 100 00 03', initials: 'MT' },
  { id: 4, name: 'Marie Camara', role: 'Caissière', phone: '+221 77 100 00 04', initials: 'MC' },
]

/** Static seed data until oRPC wiring lands in the shell. */
export const agentDays: AgentDaySummary[] = [
  {
    agentId: 1,
    agent: 'Ali Konaté',
    role: 'Livreur',
    initials: 'AK',
    expected: 147_200,
    collected: 142_700,
    deliveryStatus: 'Validé',
    collectionStatus: 'Soumis',
    matinQty: 124,
    soirQty: 0,
    hasCollection: true,
  },
  {
    agentId: 2,
    agent: 'Amina Diallo',
    role: 'Livreure',
    initials: 'AD',
    expected: 138_000,
    collected: 138_000,
    deliveryStatus: 'Validé',
    collectionStatus: 'Validé',
    matinQty: 92,
    soirQty: 0,
    hasCollection: true,
  },
  {
    agentId: 3,
    agent: 'Moussa Traoré',
    role: 'Livreur',
    initials: 'MT',
    expected: 147_000,
    collected: 150_000,
    deliveryStatus: 'À valider',
    collectionStatus: 'En attente',
    matinQty: 98,
    soirQty: 0,
    hasCollection: false,
  },
  {
    agentId: 4,
    agent: 'Marie Camara',
    role: 'Caissière',
    initials: 'MC',
    expected: 297_000,
    collected: 0,
    deliveryStatus: 'Brouillon',
    collectionStatus: 'En attente',
    matinQty: 0,
    soirQty: 198,
    hasCollection: false,
  },
]

export const stock: StockLine[] = [
  { id: 1, product: 'Pain Kilo', unit: 'unité', qty: 120, minStock: 50, location: 'Dépôt Principal' },
  { id: 2, product: 'Pain Moyen', unit: 'unité', qty: 80, minStock: 40, location: 'Dépôt Principal' },
  { id: 3, product: 'Pain Petit', unit: 'unité', qty: 25, minStock: 30, location: 'Dépôt Principal' },
  { id: 4, product: 'Croissant', unit: 'unité', qty: 60, minStock: 20, location: 'Dépôt Principal' },
]

export function formatCurrency(value: number): string {
  if (value === 0) return '—'
  return `${value.toLocaleString('fr-FR')} F`
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function getDayStats() {
  const expected = agentDays.reduce((s, a) => s + a.expected, 0)
  const collected = agentDays.reduce((s, a) => s + a.collected, 0)
  const toValidateDelivery = agentDays.filter((a) => a.deliveryStatus === 'À valider').length
  const drafts = agentDays.filter((a) => a.deliveryStatus === 'Brouillon').length
  const toValidateCollection = agentDays.filter((a) => a.collectionStatus === 'Soumis').length
  const balance = collected - expected

  return {
    expected,
    collected,
    remaining: expected - collected,
    balance,
    toValidateDelivery,
    drafts,
    toValidateCollection,
    lowStock: stock.filter((s) => s.qty < s.minStock).length,
  }
}

export function getVariance(agent: AgentDaySummary): number {
  return agent.collected - agent.expected
}
