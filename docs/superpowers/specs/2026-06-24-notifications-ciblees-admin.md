# Notifications ciblées — Admin Panel

## Résumé

Permettre à l'admin de sélectionner des clients bank (`BankCustomer`) pour envoyer des notifications ciblées (base + push Expo), au lieu de seulement broadcast "all". Les messages succès/erreur passent du inline au système Toast existant.

## Backend

### 1. GET /api/admin/customers — Liste des clients

Nouvel endpoint dans `AdminController` :

```
GET /api/admin/customers?q=&page=1&limit=10
```

- `q` : recherche insensible sur `firstName`, `lastName`, `email`, `accountNumber`
- `page` : numéro de page (default 1)
- `limit` : taille de page (default 10)
- **Response** : `{ data: CustomerListItem[], total: number, page: number, limit: number }`
- `CustomerListItem` : `{ id, firstName, lastName, email, accountNumber }`
- Protégé par `JwtAuthGuard` + `RolesGuard` (ADMIN/SUPER_ADMIN)

### 2. DTO Broadcast — Ajout customerTargets

Dans `BroadcastDto` :

```typescript
customerTargets?: string[];
```

Chaque entrée peut être :
- Un UUID de `BankCustomer.id`
- Un email de `BankCustomer.email`

Le backend résout :
1. `findMany({ where: { OR: [ { id: in targets }, { email: in targets } ] } })`
2. Pour chaque BankCustomer, lookup `userConnection` → `userId`
3. Filtre les `userId` non null

### 3. Broadcast modifié — Push ciblé

Quand `customerTargets` est présent :
1. Résoudre `BankCustomer[]` → `User.id[]`
2. `notificationsService.createMany(userIds, ...)`
3. `pushService.sendToMany(userIds, ...)` — nouvelle méthode optionnelle ou `sendToUser()` en boucle

Pas de changement pour `target: 'all'` et `target: string[]` (user IDs).

### 4. PushService.sendToMany()

Ajouter une méthode qui envoie une notification push à une liste de userIds :

```typescript
async sendToMany(userIds: string[], notification: PushNotificationData): Promise<void>
```

Implémentation : itérer sur les userIds, collecter les tokens, envoyer via Expo API, nettoyer les invalides.

## Frontend

### 1. API client — Nouveaux appels

Dans `admin/src/lib/api/index.ts` :

```typescript
listCustomers: (q?: string, page?: number, limit?: number) =>
  request<{ data: any[]; total: number; page: number; limit: number }>(
    `/customers?q=${encodeURIComponent(q || '')}&page=${page || 1}&limit=${limit || 10}`
  ),
```

### 2. Formulaire Notifications.svelte — Modifications

**Ajout d'un état :**
```typescript
let selectedCustomers: { id: string; firstName: string; lastName: string; email: string }[] = $state([]);
let customerSearchQuery: string = $state('');
let customerSearchResults: any[] = $state([]);
let showCustomerDrawer: boolean = $state(false);
let customerLoading: boolean = $state(false);
```

**Drawer de sélection des clients :**
- Bouton "Cibler des clients ⌄" avec compteur (si `selectedCustomers.length > 0`)
- `Drawer` avec :
  - Champ de recherche avec debounce 300ms
  - Liste des résultats avec cases à cocher
  - Pagination (suivant/précédent)
  - Badge des utilisateurs déjà sélectionnés en haut de la liste
- Champ email additionnel : un textarea où on peut coller des emails, qui sont résolus en `customerTargets`
- Les clients sélectionnés s'affichent en chips sous le bouton avec bouton × pour retirer
- À l'envoi : `customerTargets: selectedCustomers.map(c => c.id)` (ou les emails si saisis)

### 3. Toast — Remplacement des messages inline

- Supprimer les `<div>` `bg-green-100` / `bg-red-50` pour les messages de succès/erreur (lignes 71-80)
- Les remplacer par `toast.success(...)` et `toast.error(...)` depuis `$lib/stores/toast.svelte.ts`
- Garder l'affichage du nombre d'utilisateurs touchés dans le toast

### 4. Flux utilisateur

1. Admin ouvre la page Notifications
2. Voit les stats + formulaire broadcast
3. Optionnel : clique "Cibler des clients" → drawer s'ouvre
4. Recherche des clients par nom/email/compte
5. Coche les clients visés (ou colle des emails)
6. Ferme le drawer → compteur mis à jour
7. Remplit titre/message/type/sévérité
8. Clique "Diffuser"
9. Toast de succès "Notification envoyée à X clients" ou toast d'erreur

## Tests

- Backend : tester `GET /admin/customers` (recherche, pagination)
- Backend : tester broadcast avec `customerTargets` (résolution BankCustomer → User, création notif, push)
- Frontend : vérifier que le drawer s'ouvre/ferme, que la recherche fonctionne, que les chips s'affichent
- Frontend : vérifier que les toasts remplacent les messages inline

## Non-inclus (scope exclu)

- Export CSV des clients
- Groupes de clients prédéfinis
- Planification de l'envoi (send later)
- État "read" dans les stats temps réel
