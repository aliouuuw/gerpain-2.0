# Gerpain — Mock v2

Prototype React + Vite du shell Gerpain 2.0. Orientation **grand livre du jour** : une seule journée, une boulangerie, des actions claires pour des opérateurs peu techniques.

## Changements récents

- **En-têtes en double supprimés** — un seul titre par page (dans `App.tsx`)
- **Barre du jour** — boulangerie + date + alertes (« 2 à valider · 1 brouillon »)
- **Accueil orienté actions** — liste « À faire maintenant » au lieu de cartes KPI génériques
- **Livraisons / Encaissements par agent** — une ligne par livreur/caissier, lien livraison → encaissement
- **Textes d’aide** sur les écrans clés (français simple)
- **Onglets raccourcis** — Équipe, Réglages

## Stack

- React 19 + Vite
- TypeScript
- CSS variables (pas de Tailwind dans le mock)
- `lucide-react` pour les icônes
- `localStorage` pour la persistance du thème

## Pages mockées

- **Accueil** — dashboard avec statistiques et alertes
- **Livraisons** — table des tournées et statuts de validation
- **Encaissements** — suivi attendu / collecté / écarts
- **Stock** — inventaire, seuils et alertes
- **Ressources Humaines** — fiches agents
- **Paramètres** — configuration boulangerie / produits / notifications

## Thèmes

- **Gerpain legacy** (défaut)
- **Warm precision**
- **Clinical sharp**
- **Caisse sénégalaise**
- **Lumen neo**
- **Lumière matinale**

## Commandes

```bash
# Développement
bun run --filter gerpain-mock-v2 dev

# Build
bun run --filter gerpain-mock-v2 build

# Preview
bun run --filter gerpain-mock-v2 preview
```

Les données sont fictives et servent uniquement à la validation de l’IA/UX.
