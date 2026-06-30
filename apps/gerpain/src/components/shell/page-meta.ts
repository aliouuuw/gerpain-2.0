import { settingsSectionMeta } from '#/lib/settings-nav'

export interface ShellPageMeta {
  title: string
  subtitle: string
}

export const shellPageMeta: Record<string, ShellPageMeta> = {
  '/': {
    title: 'Accueil',
    subtitle: 'Ce qu’il reste à faire aujourd’hui',
  },
  '/livraisons': {
    title: 'Livraisons',
    subtitle: 'Quantités sorties et vendues par agent (Matin / Soir)',
  },
  '/encaissements': {
    title: 'Encaissements',
    subtitle: 'Argent reçu par rapport à ce qui était attendu',
  },
  '/reconciliations': {
    title: 'Réconciliations',
    subtitle: 'Vue d’ensemble par agent sur la période',
  },
  '/stock': {
    title: 'Stock',
    subtitle: 'Quantités en dépôt',
  },
  '/equipe': {
    title: 'Équipe',
    subtitle: 'Livreurs, caissiers et contacts',
  },
  '/reglages': {
    title: 'Réglages',
    subtitle: 'Boulangerie, produits et notifications',
  },
}

export function getShellPageMeta(pathname: string): ShellPageMeta {
  if (pathname.startsWith('/reglages/')) {
    return settingsSectionMeta[pathname] ?? shellPageMeta['/reglages']
  }

  return shellPageMeta[pathname] ?? { title: 'Gerpain', subtitle: '' }
}
