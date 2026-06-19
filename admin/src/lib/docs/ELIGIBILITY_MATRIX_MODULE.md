# Module d'Éligibilité Matricielle

## Vue d'ensemble

Remplace l'évaluation par règles `if/else` par un **calcul matriciel vectorisé**. Chaque produit bancaire est représenté par une colonne de poids dans une matrice. Le client est représenté par un vecteur de métriques financières. Le score d'éligibilité = `vecteur × matrice`.

## Architecture

```
POST /eligibility/evaluate
  → EligibilityController
    → EligibilityService (mode='matrix' par défaut)
      → MatrixEligibilityEngine
        ├── OverviewService.gatherMetrics()     ← calcule les métriques client
        ├── EligibilityMatrixBuilder.loadProducts() ← charge matrice depuis DB (cache Redis)
        ├── computeRuleSatisfaction()            ← compare métrique × seuil
        ├── scoreProduct()                       ← somme pondérée des satisfactions
        └── normalizedScoreToStatus()            ← seuillage ELIGIBLE/PARTIAL/NOT_ELIGIBLE
```

## Flux détaillé

### 1. Vecteur client (12 dimensions)

Construit par `eligibility-context.builder.ts` à partir des métriques `gatherMetrics()` :

| Index | Feature | Source | Normalisation |
|-------|---------|--------|---------------|
| 0 | `debtRatio` | `analytics.debtRatio` | /100 |
| 1 | `monthlyIncome` | `analytics.monthlyIncome` | /5_000_000 |
| 2 | `overdraftDays` | `analytics.overdraftDays` | /31 |
| 3 | `savingsRegularity` | `analytics.savingsRegularityScore` | /100 |
| 4 | `expenseRatio` | `analytics.expenseRatio` | /100 |
| 5 | `repaymentRegularity` | `analytics.repaymentRegularityScore` | /100 |
| 6 | `revenueVolatility` | `analytics.revenueVolatilityScore` | 1 - (score/100) |
| 7 | `emergencyFund` | `analytics.emergencyFundScore` | /100 |
| 8 | `balanceVolatility` | `analytics.balanceVolatilityScore` | 1 - (score/100) |
| 9 | `savingsRate` | `analytics.savingsRate` | /100 |
| 10 | `globalScore` | calculé via `computeGlobalScore()` | /100 |
| 11 | `depositAmount` | `clientInputs.depot/dat_montant/...` | /50_000_000 |

Toutes les valeurs sont **clampées entre 0 et 1**.

### 2. Matrice des poids

Construite **dynamiquement** depuis les règles ELIGIBILITY en base de données par `eligibility-matrix.builder.ts` :

```
                    COMPTES_PART  VISA_LIBERTE  COMPTES_ENT
debtRatio               -0.35         -0.35          0
monthlyIncome            0.30          0.30          0
overdraftDays           -0.20         -0.20          0
savingsRegularity        0.15          0.15          0
depositAmount              0             0          1.0
```

**Règle de conversion** règle DB → poids matriciel :
- `operator = LESS_THAN / LESS_OR_EQUAL` → **poids négatif** (plus la valeur est élevée, plus le score baisse)
- `operator = GREATER_THAN / GREATER_OR_EQUAL` → **poids positif** (plus la valeur est élevée, plus le score monte)
- Magnitude du poids = `rule.weight / 100`

### 3. Satisfaction de règle (0 à 1)

`computeRuleSatisfaction()` transforme chaque règle avec son seuil en une fonction continue :

```
LESS_THAN (ex: debtRatio < 33) :
  satisfaction = 0 si value >= threshold
  satisfaction = 1 si value <= threshold - margin
  linéaire entre (threshold - margin, threshold)

GREATER_THAN (ex: monthlyIncome >= 200k) :
  satisfaction = 0 si value <= threshold
  satisfaction = 1 si value >= threshold + margin
  linéaire entre (threshold, threshold + margin)

BETWEEN :
  satisfaction = 0 si value <= valueMin
  satisfaction = 1 si value >= valueMax
  linéaire entre (valueMin, valueMax)

EQUALS / NOT_EQUALS :
  satisfaction = 1 - |value - threshold| / tolerance
```

La **marge** = `max(|threshold| × 0.5, 1)` pour éviter les transitions brutales.

### 4. Score produit

```
rawScore = Σ(satisfaction_i × weight_i) / Σ(weight_i)
normalizedScore = clamp(rawScore, 0, 1)
```

### 5. Seuils de décision

| Score | Statut |
|-------|--------|
| ≥ 0.70 | **ELIGIBLE** |
| ≥ 0.40 | **PARTIAL** |
| < 0.40 | **NOT_ELIGIBLE** |

## Cache

La matrice (produits + règles ELIGIBILITY) est mise en cache dans **Redis** avec la clé `eligibility:matrix:products` et un TTL de **3600 secondes**.

Pour invalider le cache manuellement :
```typescript
await matrixBuilder.invalidateCache();
```

## API

### POST /eligibility/evaluate

**Corps de la requête :**
```json
{
  "customerId": "3dc5213d-...",
  "productCode": "COMPTES_PART",
  "inputs": {
    "dat_montant_min": 10000000
  },
  "mode": "matrix"
}
```

**Paramètres :**
- `mode` : `"matrix"` (défaut) ou `"rules"` (ancien moteur)

## Fichiers du module

```
src/eligibility/matrix/
├── types.ts                           # Types EligibilityMetrics, MatrixProduct, MatrixRule
├── eligibility-context.builder.ts     # buildEligibilityVector(), computeRuleSatisfaction()
├── eligibility-matrix.builder.ts      # Charge produits + règles depuis DB, cache Redis
├── eligibility-scoring.engine.ts      # scoreProduct(), normalizedScoreToStatus()
├── matrix-eligibility.engine.ts       # Moteur principal (orchestre le calcul)
├── eligibility-matrix.module.ts       # Module NestJS
└── index.ts                           # Barrel exports
```

Fichiers modifiés :
```
src/eligibility/eligibility.module.ts   → importe EligibilityMatrixModule
src/eligibility/eligibility.service.ts  → utilise MatrixEligibilityEngine par défaut
src/eligibility/eligibility.controller.ts → transmet le paramètre mode
src/eligibility/dto/eligibility.dto.ts  → ajoute le champ mode optionnel
```

## Différence avec l'ancien système

| Aspect | Ancien (rules) | Nouveau (matrix) |
|--------|---------------|------------------|
| Évaluation | `if/else` par règle | Produit scalaire vectorisé |
| Score | PASS/FAIL binaire | Continu 0-1 |
| Seuils | Coupure brutale | Transition linéaire (marge) |
| Règles DB | Lues à chaque appel | Chargées + cache Redis |
| Extensibilité | Nouveau if/else à chaque règle | Nouvelle colonne dans la matrice |
| Entraînement | Impossible | Possible (gradient descent) |

## Entraînement futur

Le système est conçu pour supporter l'entraînement par descente de gradient (même principe que `trainSingleLayer()` dans `analytics/training/`) :

1. Collecter des données historiques : `{metrics, productCode, decision}` où `decision` = ELIGIBLE / NOT_ELIGIBLE
2. Initialiser les poids avec les valeurs issues des règles DB
3. Lancer `trainSingleLayer()` pour ajuster les poids automatiquement
4. Les nouveaux poids remplacent la matrice initiale

```typescript
// Exemple de structure de donnée d'entraînement :
{
  context: { debtRatio: 25, monthlyIncome: 500000, overdraftDays: 3, ... },
  expected: "COMPTES_PART" // produit accordé
}
```

## Notes importantes

- Les règles de type **FEE, LIMIT, INTEREST, VALUE_DATE** ne sont pas concernées par la matrice — elles sont toujours stockées en DB et renvoyées comme informations dans la réponse.
- Les champs métier non mappables en continu (`dat_duree_mois`, `bon_caisse_duree_mois`) sont gérés via `clientInputs` uniquement — si le champ n'est pas fourni, la satisfaction est 0.
- Le mode `rules` est conservé pour comparaison et fallback.
