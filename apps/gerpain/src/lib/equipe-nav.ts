import type { SectionNavItem } from '#/components/layout/SectionNavLayout'

export const equipeNavItems = [
  {
    to: '/equipe/annuaire',
    label: 'Effectif',
    hint: 'Agents, contacts et statuts',
    matchPath: '/equipe/agents',
    group: 'Effectif',
  },
  {
    to: '/equipe/remuneration',
    label: 'Rémunération',
    hint: 'Salaire de base et commissions par produit',
    group: 'Paie & rémunération',
  },
  {
    to: '/equipe/avances',
    label: 'Avances',
    hint: 'Avances sur salaire et remboursements',
    group: 'Paie & rémunération',
  },
  {
    to: '/equipe/conges',
    label: 'Congés',
    hint: 'Demandes et absences',
    group: 'Paie & rémunération',
  },
  {
    to: '/equipe/paie',
    label: 'Paie',
    hint: 'Bulletins et clôture de période',
    disabled: true,
    group: 'Clôture',
  },
] as const satisfies readonly SectionNavItem[]

export const equipeSectionMeta: Record<
  string,
  { title: string; subtitle: string }
> = {
  '/equipe/annuaire': {
    title: 'Personnel & paie',
    subtitle: 'Effectif — agents et contacts',
  },
  '/equipe/agents': {
    title: 'Personnel & paie',
    subtitle: 'Fiche agent',
  },
  '/equipe/remuneration': {
    title: 'Personnel & paie',
    subtitle: 'Rémunération — salaire et commissions par produit',
  },
  '/equipe/avances': {
    title: 'Personnel & paie',
    subtitle: 'Avances sur salaire',
  },
  '/equipe/conges': {
    title: 'Personnel & paie',
    subtitle: 'Congés et absences',
  },
  '/equipe/paie': {
    title: 'Personnel & paie',
    subtitle: 'Paie — bulletins et clôture',
  },
}
