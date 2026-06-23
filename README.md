# API Orabank — Backend

Backend NestJS de l'application Orabank. Authentification JWT, analytics financiers, éligibilité produits, synchronisation SMS Mobile Money.

**Base URL:** `http://localhost:4000`  
**Swagger:** `GET /api/docs`

---

## Authentification

| Type | Détail |
|------|--------|
| **Méthode** | JWT Bearer Token |
| **Header** | `Authorization: Bearer <token>` |
| **Access Token** | 15 min |
| **Refresh Token** | 7 jours |
| **Rôles** | `CLIENT`, `AGENT`, `ADMIN`, `SUPER_ADMIN` |

---

## Santé & Documentation

| Méthode | Path | Auth | Description |
|---------|------|------|-------------|
| `GET` | `/ping` | ❌ | Health check → `"pong"` |
| `GET` | `/dashboard` | ❌ | Serve le dashboard HTML statique |
| `GET` | `/admin/*path` | ❌ | Serve l'admin SPA |
| `GET` | `/api/docs` | ❌ | Interface Swagger / Scalar |

---

## Auth — `/auth`

### `POST /auth/register` — ❌ Public

Inscription en **4 étapes**. Chaque appel avance d'une étape.

**Étape 1 — Vérification du compte**
```json
// Request
{ "accountNumber": "4443185208" }

// Response 200
{ "step": "verify_contact", "message": "Compte trouvé. Entrez votre email ou téléphone." }
```

**Étape 2 — Envoi OTP**
```json
// Request
{
  "accountNumber": "4443185208",
  "contact": "joan@gmail.com",
  "contactType": "email"
}

// Response 200
{ "step": "verify_otp", "message": "Code OTP envoyé." }
```

**Étape 3 — Validation OTP**
```json
// Request
{ "accountNumber": "4443185208", "otp": "847291" }

// Response 200
{ "step": "set_password", "message": "OTP validé. Créez votre mot de passe." }
```

**Étape 4 — Création mot de passe**
```json
// Request
{ "accountNumber": "4443185208", "password": "motdepasse123" }

// Response 201
{
  "step": "complete",
  "message": "Compte activé avec succès.",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### `POST /auth/login` — ❌ Public

```json
// Request
{ "contact": "joan@gmail.com", "password": "motdepasse123" }

// Response 200
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "role": "CLIENT",
    "username": "Joan Doe"
  }
}
```

---

### `POST /auth/me` — ✅ Bearer

```json
// Response 200
{
  "id": "clx...",
  "email": "user@example.com",
  "role": "CLIENT",
  "username": "Joan Doe"
}
```

---

### `POST /auth/refresh` — ❌ Public

```json
// Request
{ "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }

// Response 200
{ "accessToken": "...", "refreshToken": "..." }
```

---

### `POST /auth/logout` — ❌ Public

```json
// Request
{ "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }

// Response 200
{ "message": "Déconnecté avec succès" }
```

---

### `POST /auth/resend-otp` — ❌ Public

```json
// Request
{ "accountNumber": "4443185208" }

// Response 200
{ "message": "Nouveau code OTP envoyé." }
```

---

### `POST /auth/forgot-password` — ❌ Public

**3 étapes :**

**Étape 1**
```json
// Request
{ "contact": "joan@gmail.com" }

// Response
{ "step": "verify_otp", "message": "Code OTP envoyé." }
```

**Étape 2**
```json
// Request
{ "contact": "joan@gmail.com", "otp": "847291" }

// Response
{ "step": "reset_password", "message": "OTP validé. Entrez votre nouveau mot de passe." }
```

**Étape 3**
```json
// Request
{ "contact": "joan@gmail.com", "newPassword": "password123" }

// Response
{ "step": "complete", "message": "Mot de passe réinitialisé avec succès." }
```

---

## Admin — `/api/admin` — ✅ Bearer + Rôle `ADMIN` / `SUPER_ADMIN`

### Produits bancaires

| Méthode | Path | Description |
|---------|------|-------------|
| `GET` | `/api/admin/products` | Liste tous les produits |
| `GET` | `/api/admin/products/:id` | Produit par UUID |
| `POST` | `/api/admin/products` | Créer un produit |
| `PUT` | `/api/admin/products/:id` | Modifier un produit |
| `PUT` | `/api/admin/products/:id/rules` | Lier des règles à un produit |
| `DELETE` | `/api/admin/products/:id` | Supprimer un produit |

**`PUT /api/admin/products/:id/rules`**
```json
// Request
{ "ruleIds": ["uuid1", "uuid2"] }

// Response
{ "cleared": 2, "updated": 3 }
```

### Règles

| Méthode | Path | Description |
|---------|------|-------------|
| `GET` | `/api/admin/rules` | Liste toutes les règles |
| `GET` | `/api/admin/rules/:id` | Règle par UUID |
| `POST` | `/api/admin/rules` | Créer une règle |
| `PUT` | `/api/admin/rules/:id` | Modifier une règle |
| `DELETE` | `/api/admin/rules/:id` | Supprimer une règle |

### Catalogue des messages

| Méthode | Path | Description |
|---------|------|-------------|
| `GET` | `/api/admin/catalog` | Récupérer le catalogue |
| `PUT` | `/api/admin/catalog` | Mettre à jour le catalogue |

### Classifieur / Embeddings / Training

| Méthode | Path | Description |
|---------|------|-------------|
| `GET` | `/api/admin/classifier/test?desc=` | Tester le classifieur |
| `GET` | `/api/admin/embedding/stats` | Stats embeddings |
| `GET` | `/api/admin/embedding/neighbors?desc=&n=` | Plus proches voisins |
| `GET` | `/api/admin/training/examples` | Liste exemples d'entraînement |
| `PUT` | `/api/admin/training/examples/:id` | Modifier un exemple |
| `POST` | `/api/admin/training/examples` | Créer un exemple |
| `DELETE` | `/api/admin/training/examples/:id` | Supprimer un exemple |
| `POST` | `/api/admin/training/run` | Lancer l'entraînement |

**`POST /api/admin/training/run`**
```json
// Request (optionnel)
{ "epochs": 50, "lr": 0.001, "layers": 1, "margin": 0.1 }

// Response
{ "config": { "...": "..." }, "finalAccuracy": 0.95, "metrics": [...] }
```

**`POST /api/admin/sms/debug`**
```json
// Request
{ "address": "MTN", "body": "Vous avez recu 5000 FCFA de...", "dateSent": "2024-01-15T10:30:00Z" }

// Response
{
  "steps": {
    "parseSms": { "operator": "MTN", "direction": "CREDIT", "amount": 5000, "sender": "XXXXX" },
    "dateValidation": { "raw": "...", "valid": true },
    "classifier": { "...": "..." }
  },
  "verdict": "INSERT",
  "reason": "parseSms OK (amount + direction)"
}
```

---

## Analytics — `/analytics/:customerId` — ✅ Bearer

**Paramètres query communs :** `?from=YYYY-MM-DD&to=YYYY-MM-DD&year=2024&month=1`

### Revenus

| Méthode | Path | Description |
|---------|------|-------------|
| `GET` | `/analytics/:customerId/overview` | Vue complète (tous les indicateurs) |
| `GET` | `/analytics/:customerId/revenues/cashflow` | Flux de trésorerie |
| `GET` | `/analytics/:customerId/revenues/monthly` | Revenus mensuels |
| `GET` | `/analytics/:customerId/revenues/summary` | Résumé mensuel |
| `GET` | `/analytics/:customerId/revenues/frequency` | Fréquence des revenus |
| `GET` | `/analytics/:customerId/revenues/sources` | Sources de revenus |
| `GET` | `/analytics/:customerId/revenues/variation` | Variation des revenus (défaut 6 mois) |

**`GET .../revenues/cashflow`**
```json
{
  "period": { "from": "2024-01-01", "to": "2024-06-30" },
  "totalCredits": { "count": 5, "amount": 1500000 },
  "totalDebits": { "count": 20, "amount": 800000 },
  "netFlow": 700000
}
```

**`GET .../revenues/monthly`** ou **`.../revenues/summary`**
```json
{
  "currentMonth": { "total": 1500000, "month": "2024-05" },
  "previousMonth": { "total": 1450000, "month": "2024-04" },
  "averageLast6Months": 1450000,
  "variationPercent": 3.45,
  "trend": "UP",
  "rolling30Days": 1200000
}
```

**`GET .../revenues/frequency`**
```json
{
  "entriesPerMonth": 4,
  "entriesPerWeek": 1,
  "averageIntervalDays": 7.5,
  "stabilityStdDev": 1.2,
  "coefficientOfVariation": 15.5,
  "stabilityLabel": "STABLE",
  "stabilityScore": 70
}
```

**`GET .../revenues/sources`**
```json
{
  "source": [{ "category": "SALARY", "amount": 1200000, "percent": 80, "count": 1 }],
  "totalAmount": 1500000,
  "dominantSource": "SALARY"
}
```

**`GET .../revenues/variation`**
```json
{
  "monthlyRevenues": [{ "month": "2024-05", "amount": 1500000, "variationPercent": 5.2 }],
  "averageVariationPercent": 2.1,
  "stdDev": 50000,
  "coefficientOfVariation": 12.5,
  "trend": "UP",
  "volatilityScore": 85
}
```

### Dépenses

| Méthode | Path | Description |
|---------|------|-------------|
| `GET` | `/analytics/:customerId/expenses/detect` | Détection des dépenses |
| `GET` | `/analytics/:customerId/expenses/categories` | Dépenses par catégorie |
| `GET` | `/analytics/:customerId/expenses/recurring?months=3` | Dépenses récurrentes |
| `GET` | `/analytics/:customerId/expenses/variable` | Variables vs récurrentes |
| `GET` | `/analytics/:customerId/expenses/ratio` | Ratio dépenses/revenus |

**`GET .../expenses/detect`**
```json
{
  "totalExpenses": 210000,
  "count": 18,
  "averageTransactionAmount": 11666,
  "largestExpense": { "amount": 80000, "description": "LOYER", "date": "2024-01-01" }
}
```

**`GET .../expenses/categories`**
```json
{
  "categories": [{ "category": "LOGEMENT", "amount": 80000, "percent": 38.1, "count": 1 }],
  "totalExpenses": 210000
}
```

**`GET .../expenses/recurring`**
```json
{
  "recurringExpenses": [{
    "description": "LOYER", "averageAmount": 80000, "frequency": "MONTHLY",
    "occurrences": 3, "nextExpectedDate": "2024-04-01", "category": "LOGEMENT"
  }],
  "totalRecurringAmount": 125000,
  "totalRecurringCount": 2
}
```

**`GET .../expenses/variable`**
```json
{
  "totalExpenses": 210000,
  "recurringExpenses": 125000,
  "variableExpenses": 85000,
  "variablePercent": 40.5,
  "variableTransactions": [{ "description": "RETRAIT GAB", "amount": 20000, "date": "2024-01-10" }]
}
```

**`GET .../expenses/ratio`**
```json
{
  "totalRevenues": 275000,
  "totalExpenses": 210000,
  "ratio": 76.4,
  "ratioLabel": "ATTENTION",
  "score": 50,
  "interpretation": "Vous dépensez 76% de vos revenus ce mois"
}
```

### Solde

| Méthode | Path | Description |
|---------|------|-------------|
| `GET` | `/analytics/:customerId/balance/average` | Solde moyen mensuel |
| `GET` | `/analytics/:customerId/balance/extremes` | Solde min/max |
| `GET` | `/analytics/:customerId/balance/overdrafts` | Analyse des découverts |
| `GET` | `/analytics/:customerId/balance/negative-periods` | Périodes négatives |
| `GET` | `/analytics/:customerId/balance/volatility` | Volatilité du solde |

**`GET .../balance/average`**
```json
{
  "month": "2024-01",
  "averageBalance": 125000,
  "dailyBalances": [{ "date": "2024-01-01", "balance": 180000 }]
}
```

**`GET .../balance/extremes`**
```json
{
  "minimum": { "amount": 5000, "date": "2024-01-20" },
  "maximum": { "amount": 300000, "date": "2024-01-01" },
  "range": 295000
}
```

**`GET .../balance/overdrafts`**
```json
{
  "overdraftDays": 3, "totalDays": 31, "overdraftRate": 9.7,
  "overdraftLabel": "ATTENTION", "score": 70,
  "overdraftDates": ["2024-01-20", "2024-01-21", "2024-01-22"]
}
```

**`GET .../balance/negative-periods`**
```json
{
  "negativePeriods": [{ "from": "2024-01-20", "to": "2024-01-22", "durationDays": 3, "minBalance": -15000 }],
  "totalNegativeDays": 3, "averageDuration": 3, "maxDuration": 3,
  "longestPeriod": { "from": "2024-01-20", "to": "2024-01-22" }
}
```

**`GET .../balance/volatility`**
```json
{
  "averageBalance": 125000, "stdDev": 48000,
  "coefficientOfVariation": 38.4, "score": 35
}
```

### Dettes

| Méthode | Path | Description |
|---------|------|-------------|
| `GET` | `/analytics/:customerId/debts/detect` | Détection dettes |
| `GET` | `/analytics/:customerId/debt/total` | Estimation dette totale |
| `GET` | `/analytics/:customerId/debt/monthly-payments` | Paiements mensuels |
| `GET` | `/analytics/:customerId/debt/ratio` | Ratio d'endettement |
| `GET` | `/analytics/:customerId/debt/repayment-history?months=6` | Historique remboursements |

**`GET .../debts/detect`**
```json
{
  "detectedCredits": [{
    "description": "REMBOURSEMENT PRET", "monthlyAmount": 45000,
    "firstDetected": "2024-01-05", "occurences": 3, "confidence": "HIGH"
  }],
  "totalMonthlyDebt": 45000
}
```

**`GET .../debt/total`**
```json
{
  "debts": [{ "description": "REMBOURSEMENT CREDIT HABITAT", "monthlyAmount": 45000, "estimatedRemainingMonths": 18, "estimatedRemainingDebt": 810000 }],
  "totalEstimatedDebt": 810000,
  "totalMonthlyCommitments": 45000
}
```

**`GET .../debt/monthly-payments`**
```json
{
  "totalMonthlyPayments": 45000,
  "breakdown": [{ "description": "CREDIT HABITAT", "amount": 45000, "percent": 100 }]
}
```

**`GET .../debt/ratio`**
```json
{
  "monthlyIncome": 250000, "monthlyDebtPayments": 45000,
  "debtRatio": 18, "bceaoThreshold": 33, "label": "SAIN",
  "score": 100, "margin": 15,
  "interpretation": "Vous etes en dessous du seuil BCEAO de 33%"
}
```

**`GET .../debt/repayment-history`**
```json
{
  "monthsAnalyzed": 6, "paymentsOnTime": 6, "regularityRate": 100, "score": 100,
  "history": [{ "month": "2024-01", "paid": true, "daysFromExpected": 0 }]
}
```

### Score financier

| Méthode | Path | Description |
|---------|------|-------------|
| `GET` | `/analytics/:customerId/score` | Score global |
| `GET` | `/analytics/:customerId/score/explanation` | Détail du score |
| `GET` | `/analytics/:customerId/score/history?months=6` | Historique |
| `GET` | `/analytics/:customerId/score/recommendations` | Recommandations |

**`GET .../score`**
```json
{ "globalScore": 75, "label": "BON", "breakdown": { "...": "..." } }
```
Labels possibles : `EXCELLENT`, `BON`, `MOYEN`, `FAIBLE`, `CRITIQUE`

**`GET .../score/explanation`**
```json
{
  "globalScore": 75, "label": "BON",
  "indicators": [{ "name": "Ratio dépenses/revenus", "value": "45%", "score": 80, "impact": "POSITIF" }]
}
```

**`GET .../score/history`**
```json
{
  "history": [{ "month": "2024-01", "score": 65, "label": "MOYEN" }],
  "trend": "UP", "average": 72
}
```

**`GET .../score/recommendations`**
```json
{ "recommendations": ["..."] }
```

### Épargne

| Méthode | Path | Description |
|---------|------|-------------|
| `GET` | `/analytics/:customerId/savings/rate` | Taux d'épargne mensuel |
| `GET` | `/analytics/:customerId/savings/frequency?months=6` | Fréquence des dépôts |
| `GET` | `/analytics/:customerId/savings/retention?months=3` | Capacité de rétention |

### Divers

| Méthode | Path | Description |
|---------|------|-------------|
| `GET` | `/analytics/:customerId/advice` | Conseils personnalisés |
| `GET` | `/analytics/classifier/preview?customerId=&from=&to=` | Aperçu classification |
| `POST` | `/analytics/classifier/feedback` | Enregistrer un feedback |

**`POST /analytics/classifier/feedback`**
```json
// Request
{
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "description": "VIR SALAIRE MARS 2024",
  "correctCategory": "SALAIRE"
}

// Response
{ "success": true }
```

Catégories valides : `LOGEMENT`, `ALIMENTATION`, `TRANSPORT`, `SANTE`, `MOBILE_MONEY`, `CARBURANT`, `COMMERCE`, `FRAIS_BANCAIRES`, `VIREMENTS`, `RETRAITS`, `DEPOTS`, `INTERETS`, `CREDIT`, `SALAIRE`, `DIVERS`

---

## Éligibilité — `/eligibility` — ✅ Bearer

| Méthode | Path | Description |
|---------|------|-------------|
| `POST` | `/eligibility/evaluate` | Évaluer l'éligibilité d'un client |
| `GET` | `/eligibility/products` | Liste des produits actifs |
| `GET` | `/eligibility/products/:code/rules` | Règles d'un produit |

### `POST /eligibility/evaluate`

```json
// Request
{
  "customerId": "3dc5213d-c382-4028-9d09-9472934b791c",
  "productCode": "COMPTES_PART",
  "inputs": { "dat_montant_min": 10000000, "dat_duree_min_mois": 12 },
  "mode": "matrix"
}

// Response
{
  "productCode": "COMPTES_PART",
  "productName": "Comptes — Particuliers",
  "productDescription": "...",
  "hasEligibilityRules": true,
  "globalScore": 85,
  "maxScore": 100,
  "scorePercent": 85,
  "status": "ELIGIBLE",
  "ruleResults": [{
    "ruleId": "uuid", "ruleCode": "REVENU_MIN", "label": "Revenu minimum",
    "status": "PASS", "valueSource": "analytics",
    "clientValue": 250000, "threshold": 200000,
    "thresholdMin": null, "thresholdMax": null,
    "scoreEarned": 50, "scoreMax": 50,
    "message": "Revenu minimum : 250000 FCFA ≥ 200000 FCFA",
    "advice": null
  }],
  "infoRules": [], "passedRules": [], "failedRules": [], "partialRules": []
}
```

Statuts possibles : `ELIGIBLE`, `PARTIAL`, `NOT_ELIGIBLE`  
Statuts par règle : `PASS`, `FAIL`, `PARTIAL`

### `GET /eligibility/products`

```json
[{
  "code": "COMPTES_PART", "name": "Comptes — Particuliers",
  "description": "...", "category": "ACCOUNT",
  "_count": { "rules": 5 }
}]
```

### `GET /eligibility/products/:code/rules`

Retourne le produit complet avec son tableau `rules`.

---

## SMS — `/sms` — ✅ Bearer

| Méthode | Path | Description |
|---------|------|-------------|
| `POST` | `/sms/sync` | Synchroniser les SMS Mobile Money |

### `POST /sms/sync`

`customerId` résolu automatiquement depuis le JWT.

```json
// Request
{
  "messages": [{
    "id": 12345,
    "address": "MTN",
    "body": "Vous avez recu 5000 FCFA de...",
    "dateSent": "2024-01-15T10:30:00Z"
  }]
}

// Response
{ "synced": 5, "duplicates": 2, "skipped": 1 }
```

---

## Mail — `/mail`

| Méthode | Path | Auth | Description |
|---------|------|------|-------------|
| `GET` | `/mail` | ❌ | Test email (hardcodé vers `joan@gmail.com`) |

```json
// Response
{ "message": "Email envoyé avec succès" }
```

---

## WebSocket — Socket.IO

**Namespace :** root `/`  
**URL :** `http://localhost:4000`

| Événement | Direction | Fréquence | Données |
|-----------|-----------|-----------|---------|
| `connection` | Client → Serveur | — | — |
| `disconnect` | Client → Serveur | — | — |
| `heartbeat` | Serveur → Tous | Toutes les 10s | `{ time: "HH:MM:SS", status: "UP" }` |
| `analytics_requested` | Serveur → Tous | Sur appel analytics | `{ type, customerId }` |
| `feedback_saved` | Serveur → Tous | Sur feedback | `{ customerId, description, correctCategory }` |

---

## Modèles principaux (Prisma)

### BankCustomer
| Champ | Type |
|-------|------|
| `id` | UUID |
| `email` | String |
| `firstName` | String |
| `lastName` | String? |
| `telephone` | String |
| `accountNumber` | String (unique, 10 chiffres) |
| `customerCode` | String (unique) |
| `kycStatus` | Enum |

### BankAccount
| Champ | Type |
|-------|------|
| `id` | UUID |
| `customerId` | UUID |
| `accountId` | UUID (ref Account) |
| `iban` | String? |
| `accountType` | Enum (`CHECKING`, `SAVINGS`, `LOAN`, ...) |
| `currency` | Enum |
| `isActive` | Boolean |
| `isBlocked` | Boolean |
| `dailyLimit` | Float |
| `monthlyLimit` | Float |

### Transaction
| Champ | Type |
|-------|------|
| `id` | UUID |
| `amount` | BigInt |
| `currency` | Enum |
| `transactionType` | Enum |
| `status` | Enum |
| `description` | String? |
| `senderCustomerId` | UUID? |
| `receiverCustomerId` | UUID? |
| `journalId` | UUID |
| `ledgerId` | UUID |
| `version` | Int |

### User
| Champ | Type |
|-------|------|
| `id` | UUID |
| `email` | String (unique) |
| `password` | String? |
| `role` | Enum (`CLIENT`, `AGENT`, `ADMIN`, `SUPER_ADMIN`) |
| `mfaEnabled` | Boolean |

---

## Codes de status

| Code | Signification |
|------|---------------|
| `200` | Succès |
| `201` | Créé (register final step) |
| `401` | Non authentifié |
| `403` | Accès refusé (rôle insuffisant) |
| `404` | Ressource non trouvée |
| `409` | Conflit (ex. email déjà utilisé) |
| `429` | Trop de requêtes |
| `500` | Erreur serveur |
