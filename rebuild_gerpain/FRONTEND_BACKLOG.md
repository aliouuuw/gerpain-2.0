# Frontend Backlog – Gerpain ERP

This backlog tracks the main frontend workstreams for the rebuilt Gerpain ERP, starting with the Next.js 16 application.

Status legend:
- [x] Done
- [ ] Not started / in progress

---

## Slice 1 – Auth + Shell (Next.js)

- [x] Initial Next.js 16 app scaffold (App Router, TailwindCSS)
- [x] Set `lang="fr"` and French-only UI for MVP
- [x] Create public auth segment `(auth)` with `/login`
- [x] Implement login page in French
- [x] Wire login to existing Lucia-based endpoints:
  - `POST /api/v1/auth/signin`
  - `POST /api/v1/auth/signout`
  - `GET /api/v1/auth/profile`
- [x] Implement authenticated app shell `(app)` layout with header and `/dashboard`
- [x] Add friendly error states for invalid credentials and server errors
  - Inline French messages for: mauvais identifiants, compte désactivé, erreur serveur
  - Non-blocking banner or toast for generic backend failures
  - Preserve entered email on error; avoid leaking technical details
- [x] Add simple "mot de passe oublié" / reset password flow (UI only)
  - Link from `/login` to a dedicated page explaining the process
  - Minimal form (email) with optimistic success state, even if backend is not wired yet
  - Clear note that the functionality is en cours de mise en place for pilot clients

---

## Slice 2 – Navigation & Dashboard

- [x] Define main navigation structure for the MVP:
  - Tableau de bord
  - Ventes
  - Stock / Inventaire
  - Caisse
  - Employés
  - Ensure labels and grouping reflect BUSINESS_REQUIREMENTS domains (Sales, Inventory, Cash, HR)
  - Keep IA simple for MVP: one primary section per main daily workflow
- [x] Implement responsive sidebar / top-nav layout (mobile-first)
- [x] Add placeholder pages for each section with French copy
  - `/dashboard`: high-level KPIs (ventes du jour, stock critique, caisse, équipe)
  - `/sales`: texte d’introduction + liens vers saisie des ventes et livraisons
  - `/inventory`: texte d’introduction + liens vers ajustements et transferts
  - `/cash`: texte d’introduction + liens vers collectes et rapprochements
  - `/employees`: texte d’introduction + liens vers liste employés et pointage
- [x] Integrate TanStack Query provider at the app root
  - Configure `QueryClientProvider` in `app/layout.tsx`
  - Add a small `apiClient` helper that targets backend `/api/v1/*` endpoints
  - Define basic query keys pattern (e.g. `['sales','transactions']`, `['inventory','items']`)
- [x] Display basic dashboard metrics (static or mocked at first)
  - Cards for: ventes du jour, commandes, stock critique, équipe présente
  - Later: wire to `/reports/sales-summary`, `/inventory/items`, `/cash-collections`
- [x] Refine app shell layout consistency
  - Sidebar expand/collapse reliably shifts main content
  - Header connects flush with sidebar (no visual gap)
  - Location selector wording adjusted ("Point de vente" -> "Local")

---

## Slice 3 – Admin Area

- [ ] Create `(admin)` segment and `admin` layout
- [ ] Admin home page
- [ ] Admin users management UI
  - Table of users (`users`, `roles`, `user_roles`), basic filters and search
  - Assign/revoke roles and scopes (chaine, point de vente)
- [ ] Admin organizations management UI
  - CRUD écran pour chaînes de boulangerie et points de vente
  - Aligner avec `/bakery-chains`, `/locations`, `/location-types`
- [ ] Admin invitations management UI
  - Simple flow to inviter un nouvel utilisateur par e-mail (UI-first)
  - Track pending/accepted invitations; later hook into auth system
- [ ] Hook admin pages to existing backend endpoints when available

---

## Slice 4 – MVP Business Flows (UI-first)

Focus: build UI and UX flows first, wire to backend incrementally.

- [x] Daily sales capture screen (volume-based, caisse-friendly)
  - Vue principale pour ventes directes en magasin (transactionType = `direct_sale`)
  - Liste ou grille de produits fréquents (Pain Kilo, etc.) avec saisie rapide des quantités
  - Résumé par produit + total de la vente, choix du mode de paiement
  - Préparer le mapping vers `/sales/transactions` et `/products`
- Note: bien que cette interface soit déjà prototypée dans le frontend, elle est considérée comme une amélioration de phase 2. Le cœur du MVP côté métier se concentre d'abord sur les livraisons et les collectes.
- [x] Delivery board UI (multi-livreurs, par jour et par point de vente)
  - Vue en tableau récapitulatif pour suivre, par livreur, les quantités confiées, les retours, le % retour, le vendu et le montant dû pour une date et un point de vente donnés
  - Détail par livreur avec une vue par produit, permettant de saisir les quantités confiées et les retours, avec la possibilité de créer plusieurs lignes par produit pour différentes périodes de vente (matin / après-midi / soir)
- [ ] Basic inventory adjustment UI (entrées / sorties, transferts)
  - Liste paginée des articles de stock par point de vente (`/inventory/items`)
  - Actions: "Ajuster stock", "Sortie", "Transfert" ouvrant un formulaire simple
  - UI alignée sur le corps de requête de `/inventory/transactions`
  - Afficher état (LOW_STOCK / GOOD_STOCK) et seuils de réapprovisionnement
- [ ] Daily cash collection & reconciliation UI (axée sur les livreurs)
  - Écran pour saisir les collectes d'espèces liées aux tournées de livraison (période, montants attendus vs réels par livreur)
  - Formulaire aligné sur `/cash-collections` (période, breakdown par mode de paiement)
  - Liste des collectes par statut (en attente, collecté, rapproché)
  - Vue de base pour rapprochements ultérieurs (`/cash-reconciliations`) et suivi des soldes par livreur
- [ ] Simple employee list and basic attendance (clock in/out)
  - Tableau des employés de la chaîne / du point de vente (`/employees`)
  - Actions rapides de pointage: "Pointer entrée", "Pointer sortie" alignées sur `/attendance`
  - Synthèse journalière simple: présents, absents, en retard
- [ ] Simple reporting views (table-based summaries) for:
  - Ventes par jour / par point de vente (`/reports/sales-summary`)
  - Stock critique / ruptures (`/inventory/items` filtré sur lowStock)
  - Caisse (écarts) via variances de `/cash-collections` et `/cash-variances`
  - Use a simple and intuitive layout for reporting views
  - Display data clearly and concisely

---

## Slice 5 – Visual Design & Polish

- [ ] Define a minimal UI design system (buttons, inputs, cards, tables)
  - Documenter variantes principales (primaire, secondaire, danger, neutre)
  - Aligner les composants communs (Bouton, Input, Card, Table) avec Tailwind et librairie UI
- [ ] Consistent spacing, typography, and colors aligned with Gerpain brand
  - Échelle de spacing (8px-based), hiérarchie typographique (titres, texte, légendes)
  - Palette de couleurs principale (ambre/orange) + gris neutres pour fond/texte
- [ ] Empty states, loading states, and error messages in French
  - États vides explicites pour: ventes, inventaire, caisse, employés, rapports
  - Squelettes de chargement cohérents pour listes et cartes
  - Messages d’erreur courts en français, adaptés au contexte métier
- [ ] UX review with pilot clients and incorporate feedback
  - Organiser des revues de flux: saisie des ventes, inventaire, caisse
  - Collecter retours sur lisibilité, rapidité d’utilisation, erreurs fréquentes

---

## Future (Post-MVP, to be refined)

- [ ] Migrate backend auth from Lucia to Better Auth (or confirm staying with Lucia)
- [ ] Introduce i18n (EN/FR/Wolof) with proper translation management
- [ ] Offline capabilities for key flows (ventes, inventaire, caisse)
- [ ] PWA installation and mobile-optimized interactions for caisse & livraison
