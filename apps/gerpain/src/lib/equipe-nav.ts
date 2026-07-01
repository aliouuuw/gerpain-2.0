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
    hint: 'Règles de paie — base et commissions / u',
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
    hint: 'Aperçu, détail et clôture de période',
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
    subtitle: 'Rémunération — règles de paie',
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
    subtitle: 'Paie — aperçu, détail et clôture',
  },
}
