import type { SectionNavItem } from '#/components/layout/SectionNavLayout'

export const settingsNavItems = [
  {
    to: '/reglages/boulangerie',
    label: 'Boulangerie',
    hint: 'Informations de la boulangerie active',
  },
  {
    to: '/reglages/categories',
    label: 'Catégories',
    hint: 'Regrouper les produits',
  },
  {
    to: '/reglages/lieux',
    label: 'Lieux',
    hint: 'Boutiques et dépôts',
  },
  {
    to: '/reglages/produits',
    label: 'Produits',
    hint: 'Catalogue et prix',
  },
  {
    to: '/reglages/notifications',
    label: 'Notifications',
    hint: 'Alertes et rappels',
    disabled: true,
  },
] as const satisfies readonly SectionNavItem[]

export const settingsSectionMeta: Record<
  string,
  { title: string; subtitle: string }
> = {
  '/reglages/boulangerie': {
    title: 'Réglages',
    subtitle: 'Informations de la boulangerie active',
  },
  '/reglages/categories': {
    title: 'Réglages',
    subtitle: 'Catégories de produits',
  },
  '/reglages/lieux': {
    title: 'Réglages',
    subtitle: 'Boutiques et dépôts',
  },
  '/reglages/produits': {
    title: 'Réglages',
    subtitle: 'Catalogue produits et prix',
  },
  '/reglages/notifications': {
    title: 'Réglages',
    subtitle: 'Alertes et rappels',
  },
}
