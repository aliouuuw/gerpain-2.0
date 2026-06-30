import type { SectionNavItem } from '#/components/layout/SectionNavLayout'

export const equipeNavItems = [
  {
    to: '/equipe/annuaire',
    label: 'Annuaire',
    hint: 'Effectif, contacts et statuts',
    matchPath: '/equipe/agents',
  },
  {
    to: '/equipe/affectations',
    label: 'Affectations',
    hint: 'Produits et commissions par agent',
  },
  {
    to: '/equipe/remuneration',
    label: 'Rémunération',
    hint: 'Salaire de base, grilles et primes',
  },
  {
    to: '/equipe/avances',
    label: 'Avances',
    hint: 'Avances sur salaire et remboursements',
    disabled: true,
  },
  {
    to: '/equipe/conges',
    label: 'Congés',
    hint: 'Demandes et absences',
    disabled: true,
  },
  {
    to: '/equipe/paie',
    label: 'Paie',
    hint: 'Bulletins et clôture de période',
    disabled: true,
  },
] as const satisfies readonly SectionNavItem[]

export const equipeSectionMeta: Record<
  string,
  { title: string; subtitle: string }
> = {
  '/equipe/annuaire': {
    title: 'Personnel & paie',
    subtitle: 'Annuaire — effectif et contacts',
  },
  '/equipe/agents': {
    title: 'Personnel & paie',
    subtitle: 'Fiche agent',
  },
  '/equipe/affectations': {
    title: 'Personnel & paie',
    subtitle: 'Affectations — produits et commissions',
  },
  '/equipe/remuneration': {
    title: 'Personnel & paie',
    subtitle: 'Rémunération — salaire, grilles et primes',
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
