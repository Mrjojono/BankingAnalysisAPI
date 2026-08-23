# Recherche de client sur la page Éligibilité

## Contexte
La page Éligibilité (`admin/src/pages/Eligibility.svelte`) exigeait de coller un UUID
client (`customerId`) dans un champ texte brut pour charger le dashboard. Objectif :
permettre de chercher un client par nom, email ou n° de compte et charger son dashboard
à la sélection.

## Décisions (brainstorming validé)
- Modèle d'interaction : **combobox avec suggestions** (debounce) + chargement direct à la sélection.
- Champs de recherche : **champs actuels uniquement** (firstName, lastName, email, accountNumber) — aucune modification backend.
- Approche : **nouveau composant réutilisable `CustomerSearch.svelte`**.
- Le bouton « Rechercher » est retiré.

## Backend
Aucune modification. `GET /admin/customers?q=&page=&limit=` existe déjà
(`src/admin/admin.controller.ts:532`), exposé côté front via `api.listCustomers`
(`admin/src/lib/api/index.ts:246`). Retourne `{ data: [{ id, firstName, lastName,
email, accountNumber }], total }`.

## Composant `admin/src/lib/components/CustomerSearch.svelte`
- Props : `onSelect(customer)`, `placeholder` (défaut : « Rechercher un client par nom, email ou n° de compte »)
- Logique :
  - Debounce 300 ms ; requête seulement si `query.trim().length >= 2`
  - `api.listCustomers(query, 1, 8)` ; annulation des requêtes obsolètes (compteur/AbortController) contre les races
  - Dropdown : chaque suggestion = **Prénom Nom** + email (secondaire, tronqué) + n° compte (badge mono)
  - Clavier : ↑/↓ naviguent, Entrée sélectionne l'item surligné, Échap ferme, clic extérieur ferme
  - Sélection → champ rempli « Prénom Nom », bouton × visible pour réinitialiser, `onSelect({ id, firstName, lastName, email, accountNumber })`
  - États : chargement (spinner), « Aucun client trouvé », champ vide → dropdown fermé
- Style aligné sur la page (icône Search, border-mint-subtle, rounded-xl, focus:border-primary)

## Page `admin/src/pages/Eligibility.svelte`
- Suppression du champ UUID et du bouton « Rechercher »
- `<CustomerSearch onSelect={loadCustomer} />` ; `loadCustomer(c)` fixe `customerId = c.id`, charge `eligibilityDashboard` + `eligibilityProducts`, passe `searched = true`, onglet « dashboard »
- `customerId` reste stocké en interne (utilisé par `evaluate` / `simulate` / `plan`), qui restent bloqués tant qu'aucun client n'est sélectionné
- Bandeau discret du client sélectionné (Prénom Nom — email) au-dessus des onglets
- Texte de l'état vide mis à jour : « Recherchez un client par nom, email ou n° de compte. »

## Vérification
- `npm run build` (vite build) dans `admin/`
- Vérification manuelle du flux complet (suggestions → sélection → dashboard → simulate → plan) une fois le backend lancé
