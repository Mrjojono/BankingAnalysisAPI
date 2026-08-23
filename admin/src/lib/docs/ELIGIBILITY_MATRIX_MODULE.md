# Module d'Éligibilité

## Vue d'ensemble

Le module d'éligibilité évalue si un client est éligible à un produit bancaire. Deux moteurs sont disponibles :
- **Matrix** (défaut) : scoring continu pondéré via `scoreProduct()` : satisfaction linéaire par règle
- **Rules** (legacy) : scoring binaire pass/fail via `RuleEvaluator`

## Architecture

```
POST /eligibility/evaluate
  → EligibilityController
    → EligibilityService (mode='matrix' par défaut)
      → MatrixEligibilityEngine
        ├── OverviewService.gatherMetrics()     ← métriques client
        ├── EligibilityMatrixBuilder.loadProducts() ← produits + règles ELIGIBILITY (cache Redis)
        ├── computeGlobalScore()                ← score global 4 composantes
        ├── scoreProduct()                       ← somme pondérée des satisfactions
        ├── normalizedScoreToStatus()            ← seuillage ELIGIBLE/PARTIAL/NOT_ELIGIBLE
        └── buildInfoRules()                     ← formatage règles non-ELIGIBILITY (frais, limites)
```

## Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/eligibility/evaluate` | Évaluer l'éligibilité pour un produit |
| `POST` | `/eligibility/simulate` | Simulation "what if" avec ajustements |
| `GET`  | `/eligibility/products` | Lister les produits actifs |
| `GET`  | `/eligibility/products/:code/rules` | Règles d'un produit |
| `GET`  | `/eligibility/improvement-plan/:customerId` | Plan d'amélioration |
| `GET`  | `/eligibility/dashboard/:customerId` | Dashboard complet |

## Types de réponse

### EligibilityResult

```typescript
{
  productCode: string;
  productName: string;
  productDescription: string;
  hasEligibilityRules: boolean;
  globalScore: number;     // somme pondérée des satisfactions
  maxScore: number;        // somme des poids max
  scorePercent: number;    // 0-100
  status: 'ELIGIBLE' | 'PARTIAL' | 'NOT_ELIGIBLE';
  ruleResults: RuleResult[];
  infoRules: RuleResult[];  // frais, limites, taux
  passedRules: RuleResult[];
  failedRules: RuleResult[];
  partialRules: RuleResult[];
}
```

### RuleResult

```typescript
{
  ruleId: string;
  ruleCode: string;
  label: string;
  field: string;             // champ métier (monthlyIncome, debtRatio, etc.)
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  valueSource: 'analytics' | 'input' | 'not_found';
  clientValue: number | boolean | string | null;
  threshold: number | null;
  scoreEarned: number;
  scoreMax: number;          // poids de la règle
  message: string;           // message formaté
  advice: string | null;     // conseil personnalisé si FAIL/PARTIAL
}
```

### SimulationResult

```typescript
{
  current: EligibilityResult;
  simulated: EligibilityResult;
  adjustments: Array<{ field: string; from: number; to: number; delta: number }>;
}
```

### ImprovementPlan

```typescript
{
  customerId: string;
  currentGlobalScore: number;
  maxScore: number;
  potentialScore: number;
  improvementRate: number;   // pourcentage
  items: ImprovementPlanItem[];
}
```

## Scoring continu (matrix)

### Satisfaction par règle (0 à 1)

`computeRuleSatisfaction()` compare chaque métrique à son seuil :

| Opérateur | Comportement |
|-----------|-------------|
| `LESS_THAN` | 1 si bien en dessous du seuil, 0 si au-dessus, linéaire dans la marge |
| `GREATER_THAN` | 0 si en dessous du seuil, 1 si bien au-dessus, linéaire dans la marge |
| `BETWEEN` | Interpolation linéaire entre valueMin et valueMax |
| `EQUALS` | Basé sur la distance au seuil avec tolérance de 10% |

La **marge** est spécifique par champ :
- `monthlyIncome` : 200 000 FCFA
- `debtRatio` : 5%
- `overdraftDays` : 2 jours
- `savingsRate` : 3%
- `expenseRatio` : 5%
- Autres : `max(|threshold| × 15%, 1)`

### Score produit

```
rawScore = Σ(satisfaction_i × weight_i) / Σ(weight_i)
normalizedScore = clamp(rawScore, 0, 1)
```

### Seuils de décision

| Score | Statut |
|-------|--------|
| ≥ 0.70 | **ELIGIBLE** |
| ≥ 0.40 | **PARTIAL** |
| < 0.40 | **NOT_ELIGIBLE** |

## Score global 4 composantes

Calculé par `computeGlobalScore()` pour chaque client :

| Composante | Indicateurs | Pondération |
|-----------|-------------|-------------|
| **C1** Expenses | expenseRatioScore × 0.5 + paymentRegularityScore × 0.5 | 25% |
| **C2** Debt | debtRatioScore × 0.4 + repaymentRegularityScore × 0.35 + creditUtilizationScore × 0.25 | 25% |
| **C3** Savings | savingsRateScore × 0.5 + emergencyFundScore × 0.3 + savingsRegularityScore × 0.2 | 25% |
| **C4** Stability | overdraftScore × 0.4 + revenueVolatilityScore × 0.35 + balanceVolatilityScore × 0.25 | 25% |

Score final = `C1 × 0.25 + C2 × 0.25 + C3 × 0.25 + C4 × 0.25`, arrondi.

## Conseils par règle

Le moteur génère automatiquement des conseils personnalisés pour chaque règle FAIL/PARTIAL :

| Champ | Conseil (FAIL) | Conseil (PARTIAL) |
|-------|----------------|-------------------|
| `monthlyIncome` | "Vos revenus sont insuffisants..." | "Vos revenus sont proches..." |
| `debtRatio` | "Votre taux d'endettement est trop élevé..." | "Votre taux d'endettement est limite..." |
| `expenseRatio` | "Vos dépenses sont trop élevées..." | "Votre ratio dépenses/revenus est élevé..." |
| `savingsRate` | "Votre taux d'épargne est insuffisant..." | "Continuez à améliorer votre taux d'épargne..." |
| `overdraftDays` | "Vous passez trop de jours en découvert..." | "Réduisez le nombre de jours de découvert..." |

## Cache

La matrice (produits + règles ELIGIBILITY) est mise en cache dans **Redis** avec la clé `eligibility:matrix:products` et un TTL de **3600 secondes**.

Pour invalider le cache manuellement :
```typescript
await matrixBuilder.invalidateCache();
```

## Fichiers du module

```
src/eligibility/
├── types.ts                           # Types EligibilityResult, RuleResult, ANALYTICS_FIELD_MAP
├── eligibility.controller.ts          # Endpoints REST (evaluate, simulate, dashboard, etc.)
├── eligibility.service.ts             # Orchestrateur (évaluation, simulation, plan d'amélioration)
├── eligibility.module.ts              # Module NestJS
├── dto/eligibility.dto.ts             # DTOs (EvaluateEligibilityDto, SimulateEligibilityDto)
├── calibration.service.ts             # Calibration des seuils (Redis)
├── engines/
│   ├── eligibility.engine.ts          # Moteur rules (legacy)
│   └── rule-evaluator.ts              # Évaluation par règle
└── matrix/
    ├── types.ts                       # EligibilityMetrics, MatrixProduct, MatrixRule
    ├── eligibility-context.builder.ts # computeRuleSatisfaction(), FIELD_MARGINS
    ├── eligibility-matrix.builder.ts  # Charge produits depuis DB, cache Redis
    ├── eligibility-scoring.engine.ts  # scoreProduct(), normalizedScoreToStatus(), ADVICE_TEMPLATES
    ├── matrix-eligibility.engine.ts   # Moteur principal (orchestre le calcul)
    └── eligibility-matrix.module.ts   # Sous-module NestJS
```

## Différence avec l'ancien système

| Aspect | Ancien (rules) | Nouveau (matrix) |
|--------|---------------|------------------|
| Évaluation | `if/else` par règle | Somme pondérée continue |
| Score | PASS/FAIL binaire | Continu 0-1 |
| Seuils | Coupure brutale | Transition linéaire (marge) |
| Conseils | NLG via catalog | Templates par champ + NLG |
| Règles DB | Lues à chaque appel | Cache Redis 1h |

## Endpoints admin

L'admin peut accéder aux mêmes endpoints via le proxy `/eligibility` configuré dans `vite.config.ts`.
