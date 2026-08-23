# 🌱 Guide de Seeding — Base de données Orabank

Ce document décrit la procédure complète pour initialiser et peupler la base de données de développement.

## Prérequis

- Docker avec `postgres_dev` en cours d'exécution
- Node.js et npm installés
- `npx tsx` disponible (installé via devDependencies)

```bash
docker compose up -d postgres_dev   # Démarrer PostgreSQL
npm install                          # Installer les dépendances
```

## Ordre d'exécution recommandé

```
1. Migrations Prisma        (npx prisma migrate dev)
2. Bank.sql                 (données Fabricate — 10 tables)
3. seed-missing.sql         (compléments snapshots + audit logs)
4. seed:admin               (utilisateur admin)
5. seed:orabank             (produits bancaires + règles)
6. seed:education           (contenu éducatif)
7. seed:demo                (données démo optionnelles)
```

---

## Étape 1 — Migrations Prisma

```bash
npx prisma migrate dev
```

Crée toutes les tables du schéma (`prisma/schema.prisma`).

---

## Étape 2 — Import Fabricate (`bank.sql`)

Le fichier `bank.sql` contient les données générées par Fabricate pour les 10 tables bancaires principales.

```bash
docker exec -i postgres_dev psql -U joan -d bank_joan < bank.sql
```

### Tables couvertes

| Table | Rows typiques | Description |
|-------|---------------|-------------|
| `ledgers` | 4 | Grand-livres (COMPTA, BANK, DEMO, TRADER) |
| `journals` | 8 | Journaux (BQ, CH, VIR, OD, ACH, VEN, PAI, TRF) |
| `accounts` | ~110 | Plan comptable OHADA (classes 1-7) |
| `bank_customers` | 40 | Clients (noms Togo : Ewe, Kabiyé, Français) |
| `bank_accounts` | 80 | Comptes bancaires (iban TG28, swift ORABTG) |
| `beneficiaries` | 100 | Bénéficiaires virements |
| `tran_codes` | 28 | Codes opérations (format `C1-001`, `D2-001`…) |
| `transactions` | 2 000 | Transactions sur 2025-2026 (XOF) |
| `entries` | 5 004 | Écritures double entrée (debit + credit) |

---

## Étape 3 — Compléments (`seed-missing.sql`)

Le fichier `seed-missing.sql` ajoute les données absentes du export Fabricate :

```bash
docker exec -i postgres_dev psql -U joan -d bank_joan < seed-missing.sql
```

| Table | Rows | Description |
|-------|------|-------------|
| `account_balance_snapshots` | 880 | Snapshots quotidiens de soldes (2025-2026) |
| `audit_logs` | 300 | Journaux d'audit (CREATE, UPDATE, LOGIN, EXPORT, DELETE) |

---

## Étape 4 — Seed Admin

```bash
npm run seed:admin
```

Crée l'utilisateur administrateur par défaut :

| Champ | Valeur |
|-------|--------|
| Email | `admin@orabank.tg` |
| Mot de passe | `Admin123!` |
| Rôle | `ADMIN` |

Variables d'environnement optionnelles :
- `ADMIN_SEED_EMAIL` — email personnalisé
- `ADMIN_SEED_PASSWORD` — mot de passe personnalisé

---

## Étape 5 — Seed Orabank (produits + règles)

```bash
npx tsx prisma/seed-orabank.ts
```

Importe les **Conditions Générales Orabank Togo 2024** : 26 produits bancaires et 415 règles.

### Produits importés

| Catégorie | Produits |
|-----------|----------|
| **A — Particuliers** | COMPTES_PART, GESTION_COMPTE_PART, CHEQUES_PART, VISA_LIBERTE, VISA_CLASSIC, VISA_PREMIER, VISA_PLATINUM, VISA_KEAZ, VIREMENTS_PART, SERVICES_BANCAIRES_PART, BAD_PART, AUTRES_SERVICES_PART, INCIDENTS_PART, CHANGE_PART, CREDIT_CONSO_PART, CREDIT_HABITAT_PART, ETRANGER_PART |
| **B — Entreprises** | COMPTES_ENT, GESTION_COMPTE_ENT, VISA_BUSINESS, EFFETS_COMMERCE_ENT, BAD_ENT, ETRANGER_ENT, CREDIT_TRESORERIE_ENT, CREDIT_SIGNATURE_ENT, AUTRES_SERVICES_ENT |

### Types de règles

| Type | Description |
|------|-------------|
| `ELIGIBILITY` | Conditions d'éligibilité (poids 0-30, opérateurs 7 types) |
| `LIMIT` | Limites opérationnelles (montant min/max, plafonds) |
| `FEE` | Tarification (montant fixe HT, pourcentage, TAF 10%) |
| `INTEREST` | Taux d'intérêt (crédit, épargne, MTD 8%) |
| `VALUE_DATE` | Dates de valeur (délais de disponibilité) |

---

## Étape 6 — Seed Éducation

```bash
npm run seed:education
```

Contenu éducatif basé sur le guide INC 2023 (Institut National de la Consommation) :

| Table | Rows | Description |
|-------|------|-------------|
| `learning_paths` | 6 | Parcours (Budget, Épargne, Crédit, Digital, Investissement, Fiscalité) |
| `lessons` | 20 | Leçons avec blocs de contenu structurés |
| `quizzes` | 6 | Quiz d'évaluation (1 par parcours) |
| `quiz_questions` | 24 | Questions à choix multiples |
| `quiz_choices` | 84 | Choix de réponses (3-4 par question) |

---

## Étape 7 — Seed Démo (optionnel)

```bash
npm run seed:demo
```

Crée 2 clients démo avec transactions réalistes :

| Client | Code | Compte |
|--------|------|--------|
| Kodjo | `CUS-DEMO-001` | Compte courant + épargne |
| Aminata | `CUS-DEMO-002` | Compte courant + épargne |

> ⚠️ Ce seed crée ses propres `ledger`, `journal` et `accounts` (code `DEMO`). Il ne conflict pas avec les données Fabricate mais ajoute des doublons dans `ledgers` et `journals`. À exécuter seulement si besoin de données contrôlées pour les tests.

---

## Résumé de l'état de la base après seeding complet

| Table | Rows |
|-------|------|
| `users` | 4 |
| `ledgers` | 4 |
| `journals` | 8 |
| `accounts` | ~110 |
| `bank_customers` | 40 |
| `bank_accounts` | 80 |
| `beneficiaries` | 100 |
| `tran_codes` | 28 |
| `transactions` | 2 000 |
| `entries` | 5 004 |
| `account_balance_snapshots` | 880 |
| `audit_logs` | 300 |
| `bank_products` | 26 |
| `rules` | 415 |
| `learning_paths` | 6 |
| `quizzes` | 6 |

**Total : ~8 977 lignes**

---

## Reset complet

Pour repartir de zéro :

```bash
# 1. Supprimer et recréer la base
docker exec postgres_dev psql -U joan -c "DROP DATABASE bank_joan;"
docker exec postgres_dev psql -U joan -c "CREATE DATABASE bank_joan;"

# 2. Relancer les migrations
npx prisma migrate dev

# 3. Réimporter dans l'ordre
docker exec -i postgres_dev psql -U joan -d bank_joan < bank.sql
docker exec -i postgres_dev psql -U joan -d bank_joan < seed-missing.sql
npm run seed:admin
npx tsx prisma/seed-orabank.ts
npm run seed:education
npm run seed:demo          # optionnel
```

---

## Connexion à la base

| Paramètre | Valeur |
|-----------|--------|
| Host | `localhost` |
| Port | `5432` |
| Database | `bank_joan` |
| User | `joan` |
| Password | `joankekeli123` |
| URL | `postgresql://joan:joankekeli123@localhost:5432/bank_joan` |

---

## Notes techniques

- **Fabricate** (plan gratuit) génère les données bancaires de base mais pas les tables `account_balance_snapshots`, `audit_logs`, `bank_products` et `rules`
- **seed-orabank.ts** utilise `PrismaPg` adapter — nécessite `DATABASE_URL` dans `.env`
- **bank.sql** est un export SQL brut (pas Prisma) — les UUIDs sont générés aléatoirement
- **Pas de `psql` sur l'hôte** : tout passe par `docker exec postgres_dev psql ...`
