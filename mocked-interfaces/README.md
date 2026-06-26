# Gerpain — Mocked Platform Shells

Prototypes pour valider l’IA/UX et les directions visuelles avant l’implémentation Sprint A.

**Le mock v2 est maintenant une application React** dans [`mocked-interfaces/v2`](./v2) et se concentre sur l’UX/UI **Legacy** de l’application initiale.

## Voir le mock

```bash
# Développement (HMR)
bun run --filter gerpain-mock-v2 dev

# ou preview du build
bun run --filter gerpain-mock-v2 preview
```

## v2 at a glance

- **Stack** : React 19 + TypeScript + Vite + CSS variables.
- **UX** : shell Legacy avec header, breadcrumbs, onglets et 6 pages mockées.
- **Pages** : Accueil · Livraisons · Encaissements · Stock · Ressources Humaines · Paramètres.
- **Thèmes** : 6 directions — *Gerpain legacy* (défaut) · *Warm precision* · *Clinical sharp* · *Caisse sénégalaise* · *Lumen neo* · *Lumière matinale*.
- **Persistance** : le thème choisi est mémorisé dans `localStorage`.
- **Données** : fictives, en FCFA, pour la revue de layout.

## Anciens mocks

Les anciens mocks v1 (HTML statique) et les IAs non-Legacy (Feuillets, Registre, Relevé, Tournées) ont été supprimés.
