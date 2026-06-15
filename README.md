# Backend Orabank App — Documentation Analytique

## Score Global

```
GlobalScore = (C1 × 0.25) + (C2 × 0.25) + (C3 × 0.25) + (C4 × 0.25)
```

Arrondi à l'entier. Chaque composant a le même poids (25%).

**Réf :** [CFPB Financial Well-Being Scale](https://www.consumerfinance.gov/data-research/financial-well-being-survey/) — échelle 0-100.
**Note :** Le CFPB utilise une modélisation IRT (Item Response Theory) calibrée sur 6000+ répondants, pas une moyenne arithmétique.

### Label du score

| Score | Label | Réf. CFPB |
|-------|-------|---|
| ≥ 80 | EXCELLENT | ≥ 78 = "high" |
| ≥ 60 | GOOD | ≥ 62 = "moderate" |
| ≥ 40 | FRAGILE | < 62 = "low" |
| < 40 | CRITICAL | — |

---

## Composants du score

### C1 — Dépenses (poids 25%)

```
C1 = (expenseRatioScore × 0.50) + (paymentRegularityScore × 0.50)
```

**expenseRatioScore** (`classifier.ts` `interpretRatio()`)

| Ratio dépenses/revenus | Label | Score | Référence |
|---|---|---|---|
| < 50% | EXCELLENT | 100 | [FHN](https://www.financialhealthnetwork.org/) — "Spend" pillar : dépenses < 50% des revenus = excellente santé |
| < 75% | SAIN | 75 | [FHN](https://www.financialhealthnetwork.org/) — "Spend" pillar : seuil de vigilance à 75% |
| < 90% | ATTENTION | 50 | [FHN](https://www.financialhealthnetwork.org/) — approche du seuil critique |
| ≥ 90% | CRITIQUE | 10 | [FHN](https://www.financialhealthnetwork.org/) — "financially fragile" à 90%+ |

**paymentRegularityScore** (`debt.engine.ts` `calculateRepaymentHistory()`)
- Analyse 6 mois d'historique
- Vérifie la présence d'un paiement dans les 5 jours autour du 5 de chaque mois
- Score = `(paiements à temps / mois analysés) × 100`
- **Réf :** [FICO](https://www.myfico.com/credit-education/whats-in-your-credit-score) — l'historique des paiements représente 35% du score FICO

### C2 — Endettement (poids 25%)

```
C2 = (debtRatioScore × 0.40) + (repaymentRegularityScore × 0.35) + (creditUtilizationScore × 0.25)
```

**debtRatioScore** (`debt.engine.ts` `calculateDebtRatio()`)
- Ratio = `(total mensualités dette / revenus mensuels) × 100`

| Ratio | Label | Score | Référence |
|---|---|---|---|
| ≤ 15% | EXCELLENT | 100 | Seuil arbitraire (non sourcé) |
| ≤ 33% | SAIN | 80 | [BCEAO](https://www.bceao.int/fr) — Instruction n°008-09-2015, seuil réglementaire maximum d'endettement |
| ≤ 45% | ATTENTION | 40 | Seuil arbitraire (non sourcé) |
| > 45% | CRITIQUE | 10 | Seuil arbitraire (non sourcé) |

**repaymentRegularityScore** — même valeur que `paymentRegularityScore` (historique remboursements)
- **Réf :** [FICO](https://www.myfico.com/credit-education/whats-in-your-credit-score) — même logique que l'historique paiements FICO (35% du score)

**creditUtilizationScore** (`overview.service.ts` `gatherMetrics()`)

| Ratio endettement | Score | Référence |
|---|---|---|
| 0% | 100 | [FICO](https://www.myfico.com/credit-education/whats-in-your-credit-score) — "amounts owed" = 30% du score FICO |
| ≤ 15% | 80 | [FICO](https://www.myfico.com/credit-education/whats-in-your-credit-score) — taux d'utilisation < 30% recommandé |
| ≤ 33% | 60 | [BCEAO](https://www.bceao.int/fr) — seuil réglementaire |
| ≤ 45% | 30 | Seuil arbitraire (non sourcé) |
| > 45% | 10 | Seuil arbitraire (non sourcé) |

### C3 — Épargne (poids 25%)

```
C3 = (savingsRateScore × 0.50) + (emergencyFundScore × 0.30) + (savingsRegularityScore × 0.20)
```

**savingsRateScore** (`savings.engine.ts` `calculateSavingsRate()`)
- Taux = `(revenus − dépenses − remboursements dette) / revenus × 100`

| Taux d'épargne | Label | Score | Référence |
|---|---|---|---|
| ≥ 20% | EXCELLENT | 100 | [Garman & Forgue](https://www.cengage.com/c/personal-finance-13e-garman/9781337099752/) — objectif idéal |
| ≥ 10% | BIEN | 75 | [Garman & Forgue](https://www.cengage.com/c/personal-finance-13e-garman/9781337099752/) — taux recommandé minimum |
| ≥ 5% | MOYEN | 45 | Seuil arbitraire (non sourcé) |
| > 0% | FAIBLE | 20 | Seuil arbitraire (non sourcé) |
| ≤ 0% | CRITIQUE | 0 | Aucune épargne |

**emergencyFundScore** (`overview.service.ts` `gatherMetrics()`)
- Mois couverts = `solde moyen / dépenses mensuelles`

| Mois couverts | Score | Référence |
|---|---|---|
| ≥ 3 | 100 | [Garman & Forgue](https://www.cengage.com/c/personal-finance-13e-garman/9781337099752/) + [FHN](https://www.financialhealthnetwork.org/) — fonds d'urgence 3-6 mois |
| ≥ 1 | 50 | Seuil arbitraire (non sourcé) |
| < 1 | 20 | Seuil arbitraire (non sourcé) |

**savingsRegularityScore** (`savings.engine.ts` `calculateSavingsFrequency()`)
- Vérifie les crédits entrants sur comptes épargne ou contenant "EPARGNE"/"SAVINGS"

| Régularité | Score | Référence |
|---|---|---|
| ≥ 80% | 100 | Seuil arbitraire (non sourcé) |
| ≥ 60% | 70 | Seuil arbitraire (non sourcé) |
| ≥ 40% | 35 | Seuil arbitraire (non sourcé) |
| < 40% | 10 | Seuil arbitraire (non sourcé) |

### C4 — Stabilité (poids 25%)

```
C4 = (overdraftScore × 0.40) + (revenueVolatilityScore × 0.35) + (balanceVolatilityScore × 0.25)
```

**overdraftScore** (`balance.engine.ts` `calculateOverdraftFrequency()`)
- Pourcentage de jours avec solde < 0 dans le mois

| Jours négatifs | Score | Référence |
|---|---|---|
| 0% | 100 | Aucun découvert = situation idéale |
| ≤ 5% | 85 | Seuil arbitraire (non sourcé) |
| ≤ 15% | 70 | Seuil arbitraire (non sourcé) |
| ≤ 30% | 40 | Seuil arbitraire (non sourcé) |
| > 30% | 10 | Seuil arbitraire (non sourcé) |

**revenueVolatilityScore** (`revenue.engine.ts` `computeRevenueVariation()`)
- Coefficient de variation (CV) des revenus mensuels = `(écart-type / moyenne) × 100`

| CV | Score | Référence |
|---|---|---|
| < 10% | 100 | [CFPB](https://www.consumerfinance.gov/) — stabilité des revenus = bien-être financier |
| < 25% | 70 | Seuil arbitraire (non sourcé) |
| < 50% | 35 | Seuil arbitraire (non sourcé) |
| ≥ 50% | 0 | Haute volatilité |

**balanceVolatilityScore** (`balance.engine.ts` `calculateVolatility()`)
- CV des soldes quotidiens = `(écart-type solde / |solde moyen|) × 100`

| CV | Label | Score | Référence |
|---|---|---|---|
| ≤ 10 | TRES STABLE | 100 | Seuil arbitraire (non sourcé) |
| ≤ 25 | STABLE | 80 | Seuil arbitraire (non sourcé) |
| ≤ 50 | MODERE | 60 | Seuil arbitraire (non sourcé) |
| ≤ 80 | INSTABLE | 35 | Seuil arbitraire (non sourcé) |
| > 80 | TRES INSTABLE | 15 | Seuil arbitraire (non sourcé) |

---

## Endpoints

### Score

| Méthode | Endpoint | Résultat |
|---|---|---|
| GET | `:customerId/score` | Score global + composants + interprétations |
| GET | `:customerId/score/explanation` | Forces et faiblesses détaillées |
| GET | `:customerId/score/history?months=N` | Historique sur N mois |
| GET | `:customerId/score/recommendations` | Recommandations personnalisées |

### Revenus

| Méthode | Endpoint | Calcul |
|---|---|---|
| GET | `:customerId/revenues/cashflow` | Total crédits, débits, flux net sur période |
| GET | `:customerId/revenues/monthly` | Revenus mois courant + mois précédent |
| GET | `:customerId/revenues/summary` | Moyenne 6 mois, variation %, tendance |
| GET | `:customerId/revenues/frequency` | Intervalle moyen entre revenus, stabilité |
| GET | `:customerId/revenues/sources` | Répartition par catégorie (SALAIRE, etc.) |
| GET | `:customerId/revenues/variation` | Mois par mois + volatilité (CV) |

### Dépenses

| Méthode | Endpoint | Calcul |
|---|---|---|
| GET | `:customerId/expenses/detect` | Total dépenses, nombre, moyenne, plus grosse |
| GET | `:customerId/expenses/categories` | Regroupement par catégorie (classifieur) |
| GET | `:customerId/expenses/recurring` | Détection des dépenses récurrentes |
| GET | `:customerId/expenses/variable` | Split variable vs récurrent |
| GET | `:customerId/expenses/ratio` | Ratio dépenses/revenus + score |

### Solde

| Méthode | Endpoint | Calcul |
|---|---|---|
| GET | `:customerId/balance/average` | Solde moyen du mois |
| GET | `:customerId/balance/extremes` | Solde min, max, amplitude |
| GET | `:customerId/balance/overdrafts` | Jours de découvert, taux, score |
| GET | `:customerId/balance/negative-periods` | Périodes négatives consécutives |
| GET | `:customerId/balance/volatility` | Volatilité du solde (CV) |

### Endettement

| Méthode | Endpoint | Calcul |
|---|---|---|
| GET | `:customerId/debts/detect` | Détection des crédits en cours |
| GET | `:customerId/debt/total` | Estimation dette restante totale |
| GET | `:customerId/debt/monthly-payments` | Détail mensualités |
| GET | `:customerId/debt/ratio` | Taux d'endettement + score BCEAO |
| GET | `:customerId/debt/repayment-history` | Ponctualité des remboursements (6 mois) |

### Épargne

| Méthode | Endpoint | Calcul |
|---|---|---|
| GET | `:customerId/savings/rate` | Taux d'épargne + score |
| GET | `:customerId/savings/frequency` | Régularité des dépôts épargne |
| GET | `:customerId/savings/retention` | Capacité de rétention des revenus |

### Conseils

| Méthode | Endpoint | Calcul |
|---|---|---|
| GET | `:customerId/advice` | 10+ règles d'interprétation catégories |

---

## ScoreMetrics — Les 11 sous-scores

| Champ | Source | Plage | Réf. |
|---|---|---|---|
| `expenseRatioScore` | Ratio dépenses/revenus → `interpretRatio()` | 10-100 | [FHN] — Spend pillar |
| `paymentRegularityScore` | Historique remboursements 6 mois | 0-100 | [FICO] — Payment history (35%) |
| `debtRatioScore` | Taux endettement vs seuils | 10-100 | [BCEAO] — Seuil 33% |
| `repaymentRegularityScore` | Même que `paymentRegularityScore` | 0-100 | [FICO] — Payment history |
| `creditUtilizationScore` | Ratio endettement → seuils | 10-100 | [FICO] — Amounts owed (30%) |
| `savingsRateScore` | Taux d'épargne mensuel | 0-100 | [G&F] — ≥ 10% recommandé |
| `emergencyFundScore` | Mois de dépenses couverts par solde | 20-100 | [G&F] + [FHN] — 3-6 mois |
| `savingsRegularityScore` | % mois avec dépôt épargne | 10-100 | Aucune |
| `overdraftScore` | % jours négatifs dans le mois | 10-100 | Aucune |
| `revenueVolatilityScore` | CV des revenus mensuels | 0-100 | [CFPB] — Stabilité = bien-être |
| `balanceVolatilityScore` | CV des soldes quotidiens | 15-100 | Aucune |

---

## Classifieur

Les transactions sont classifiées en 15 catégories : `LOGEMENT`, `ALIMENTATION`, `TRANSPORT`, `SANTE`, `MOBILE_MONEY`, `CARBURANT`, `COMMERCE`, `FRAIS_BANCAIRES`, `VIREMENTS`, `RETRAITS`, `DEPOTS`, `INTERETS`, `CREDIT`, `SALAIRE`, `DIVERS`.

Ordre de résolution :
1. **Règles globales** (Redis) — corrections admin
2. **Cache utilisateur** (Redis) — corrections individuelles
3. **Exact match** — mots-clés dans la description
4. **Fuzzy match** — Fuse.js (seuil 0.35) + Bayes classifier

---

## Constantes clés

| Constante | Valeur | Source | Réf. |
|---|---|---|---|
| Seuil endettement BCEAO | 33% | BCEAO | Instruction n°008-09-2015 |
| Taux épargne recommandé | 10% | Garman & Forgue | Personal Finance, 13th ed. |
| Ratio dépenses sain | ≤ 75% | Financial Health Network | Spend pillar |
| Ratio dépenses critique | ≥ 90% | Financial Health Network | Financially fragile threshold |
| Jours pour dépense récurrente | 25-35 jours | — | Interne |
| Variation montant récurrent | < 10% | — | Interne |
| Occurrences min récurrent | 2 | — | Interne |

---

## Références aux méthodologies revendiquées

Le score se réclame de 5 cadres de référence. Voici ce que chacun préconise réellement et comment le code s'y conforme.

### 1. BCEAO — Banque Centrale des États de l'Afrique de l'Ouest

**Principe :** Taux d'endettement maximal de 33% (seuil réglementaire pour l'octroi de crédit).

| Dans le code | Conforme ? |
|---|---|
| `debtRatioScore` : seuil 33% pour score 80 | ✅ Seuil exact |
| `debt_ratio` < 33% → label `SAIN` | ✅ |
| Règle `RATE_MAX` dans `catalog.json` : `{threshold}` = 33% | ✅ |
| **Pb :** Aucune distinction entre crédit consommation et crédit immobilier (la BCEAO applique des règles différentes) | ⚠️ |
| **Pb :** Pas de prise en compte du reste à vivre après endettement | ⚠️ |

**Référence :** *Instruction BCEAO n°008-09-2015 relative aux conditions de banque et de crédit*

---

### 2. Financial Health Network (ex-Center for Financial Services Innovation)

**Principe :** 4 piliers de la santé financière :
1. Dépenser ≤ 75% des revenus (**Spend**)
2. Épargne ≥ 3 mois de dépenses (**Save**)
3. Endettement soutenable (**Borrow**)
4. Planifier à long terme (**Plan**)

| Dans le code | Conforme ? |
|---|---|
| Ratio dépenses ≤ 75% → score 75 (`interpretRatio`) | ✅ Aligné sur "Spend" |
| Seuil critique ≥ 90% → score 10 | ✅ FHN définit 90%+ comme "financially fragile" |
| Fonds d'urgence ≥ 3 mois → score 100 (`emergencyFundScore`) | ✅ Aligné sur "Save" |
| **Pb :** FHN met l'accent sur l'assurance et la planification retraite — aucun équivalent | ⚠️ |
| **Pb :** Les 4 piliers FHN sont censés être indépendants — le score les agrège avec des poids arbitraires | ⚠️ |
| **Pb :** FHN préconise une échelle ordinale (faible/moyen/élevé), pas un score 0-100 | ⚠️ |

**Référence :** *Financial Health Network. « U.S. Financial Health Pulse: 2024 Trends Report. »* + *« The Financial Health Score » methodology*

---

### 3. FICO Score (Fair Isaac Corporation)

**Principe :** Score de crédit 300-850 basé sur 5 composants pondérés :
- Historique paiements (35%)
- Montants dus (30%)
- Ancienneté crédit (15%)
- Nouveaux crédits (10%)
- Types crédits (10%)

| Dans le code | Conforme ? |
|---|---|
| `paymentRegularityScore` → historiques sur 6 mois | ✅ Similaire à l'historique paiements FICO |
| `creditUtilizationScore` → taux d'utilisation du crédit | ✅ Similaire au "amounts owed" FICO |
| **Pb :** FICO pèse l'historique paiements à 35%, le code le met à part égale | ⚠️ |
| **Pb :** FICO prend en compte l'ancienneté du crédit — absent ici | ❌ |
| **Pb :** FICO scale ses scores avec une calibration actuarielle (probabilité de défaut) — ici c'est arbitraire | ❌ |
| **Pb :** FICO normalise par régression logistique, pas par paliers | ❌ |
| **Pb :** FICO combine tout en un seul score — ici on sépare en 4 composants puis on recombine (double agrégation) | ⚠️ |
| **Pb :** FICO exclut les données bancaires courantes (découverts, volatilité) — le code les inclut (C4) ce qui n'est pas FICO-compatible | ⚠️ |

**Référence :** *Fair Isaac Corporation. « FICO Score: A Comprehensive Guide. » myfico.com* + *« How FICO Scores Are Calculated »*

---

### 4. CFPB — Consumer Financial Protection Bureau (Financial Well-Being Scale)

**Principe :** Questionnaire à 10 items mesurant le sentiment de sécurité financière. Les scores (0-100) sont issus d'une analyse IRT (Item Response Theory).

| Dans le code | Conforme ? |
|---|---|
| Échelle 0-100 | ✅ Même plage que CFPB |
| 4 catégories de score (EXCELLENT, GOOD, FRAGILE, CRITICAL) | ✅ Similaire aux quartiles CFPB |
| **Pb :** CFPB mesure le *sentiment subjectif* par questionnaire, pas des données objectives | ❌ Approche fondamentalement différente |
| **Pb :** Les scores CFPB sont issus d'une modélisation IRT avec calibration sur 6000+ répondants — ici c'est une agrégation arithmétique | ❌ |
| **Pb :** CFPB ne combine pas de métriques objectives (taux d'endettement, épargne) — il mesure la perception | ❌ |
| **Pb :** Les seuils CFPB (≥ 80, ≥ 60, ≥ 40, < 40) sont ceux du code | ✅ Mais l'échelle CFPB originale est : ≥ 78 « high », ≥ 62 « moderate », < 62 « low » |
| **Pb :** Le label « EXCELLENTE SANTÉ FINANCIÈRE » est proche du vocabulaire CFPB | ✅ |

**Référence :** *CFPB. « Measuring financial well-being: A guide to using the CFPB Financial Well-Being Scale. » 2015 + 2017 update* + *CFPB Financial Well-Being Scale scoring worksheet*

---

### 5. Garman & Forgue (Personal Finance)

**Principe :** Règles de base de finances personnelles tirées du manuel universitaire « Personal Finance » :
- Taux d'épargne recommandé : ≥ 10% des revenus
- Ratio logement : ≤ 35% des revenus
- Fonds d'urgence : 3-6 mois de dépenses
- Règle des 20/30/50 (besoins/envies/épargne)

| Dans le code | Conforme ? |
|---|---|
| `savingsRateScore` : seuil 10% → score 75 | ✅ Aligné sur G&F |
| `emergencyFundScore` : 3 mois → score 100 | ✅ Aligné sur G&F |
| `savingsRateScore` : 20% → 100 | ✅ G&F recommande 20% comme objectif idéal |
| **Pb :** G&F recommande 20/30/50 (besoins 50%, envies 30%, épargne 20%) — pas de règle similaire | ❌ |
| **Pb :** G&F a des seuils spécifiques logement (35%) et transport (15%) — partiellement dans `interpreter.engine.ts` | ⚠️ |
| **Pb :** G&F préconise un fonds d'urgence de 3 à 6 mois — le code ne score que 3 mois max | ⚠️ |
| **Pb :** Les seuils du code (≥ 10% → 75, ≥ 5% → 45, > 0% → 20) ne viennent d'aucune source académique | ❌ Seuils arbitraires |

**Référence :** *Garman, E. T., & Forgue, R. E. « Personal Finance. » 13th ed., Cengage Learning, 2018* + *Chapitres : Budgeting, Savings, Credit Management*

---

## Analyse des écarts méthodologiques

| Méthodologie | Ce qu'elle apporte | Ce qui manque dans le code |
|---|---|---|
| **BCEAO** | Cadre réglementaire endettement | Distinction types crédit, reste à vivre |
| **FHN** | Piliers santé financière | Assurance, planification long terme |
| **FICO** | Pondération validée, calibration actuarielle | Ancienneté crédit, normalisation logistique, exclusion des données bancaires courantes |
| **CFPB** | Échelle subjective de bien-être perçu | Approche basée sur questionnaire, modélisation IRT |
| **G&F** | Règles pratiques de budget | Règle 50/30/20, fonds d'urgence 3-6 mois |

### Synthèse des problèmes identifiés

1. **Poids égaux (25%)** — Aucune des 5 méthodologies ne justifie une pondération uniforme des composants
2. **Seuils arbitraires** — La plupart des paliers de score (`≤ 15% → 100`, `≤ 45% → 40`, etc.) n'ont pas de source documentée
3. **Pas de calibration actuarielle** — Contrairement à FICO, les scores ne sont pas liés à une probabilité de défaut observée
4. **Double agrégation** — Les sous-scores sont d'abord combinés en C1-C4, puis C1-C4 en score global — ajoute une couche de pondération injustifiée
5. **Pas d'intervalle de confiance** — Aucune indication de fiabilité du score malgré les données partielles
6. **Tendance sur 2 points** — Premier et dernier mois seulement, ignore la courbe complète

---

## Schéma de calcul

```
Transactions brutes
        ↓
   Classifieur (catégorisation)
        ↓
   Engines spécialisés (dépenses, revenus, dette, épargne, solde)
        ↓
   ScoreMetrics (11 sous-scores 0-100)
        ↓
   Score Engine (C1 × 0.25 + C2 × 0.25 + C3 × 0.25 + C4 × 0.25)
   ↓
    GlobalScoreResponse (score + label + composants + interprétations)
```

---

## Module Matriciel — Système de Scoring par Matrice de Poids

Remplace les `if/else` de l'ancien `InterpreterEngine` par un calcul vectoriel.
Le principe : **vecteur × matrice = scores → intentions classées**.

### Architecture

```
    RuleContext (catégorie, percent, change, amount...)
         ↓
    buildFeatureVector()          ← one-hot encoding + normalisation
         ↓
    FeatureVector (21 nombres)
         ↓
    computeScores()               ← vecteur × matrice de poids
         ↓
    ScoredIntent[] (17 scores, 1 par intention)
         ↓
    selectActiveIntents()         ← filtre ≥ 0.8, tri décroissant
         ↓
    scoredIntentToAdvice()        ← conversion en AdviceIntent
         ↓
    Realizer → texte lisible
```

### Feature Vector (21 dimensions)

| Index | Feature | Description | Normalisation |
|-------|---------|-------------|---------------|
| 0-15 | cat_LOGEMENT → cat_LOISIRS | One-hot encoding de la catégorie | 0 ou 1 |
| 16 | percent | Ratio dépense/revenu de la catégorie | ÷ 100 |
| 17 | change | Variation vs mois précédent | ÷ 100 |
| 18 | amount_ratio | Montant absolu | ÷ 1 000 000 |
| 19 | expense_ratio | Ratio dépenses totales/revenus | ÷ 100 |
| 20 | prev_amount_ratio | Montant mois précédent | ÷ 1 000 000 |

### Intents (17 sorties)

`LOGEMENT_CRITICAL`, `LOGEMENT_HIGH`, `LOGEMENT_OK`, `CREDIT_HIGH`, `CREDIT_NEAR_LIMIT`, `CREDIT_INCREASE`, `ALIMENTATION_SPIKE`, `ALIMENTATION_HIGH`, `TRANSPORT_SPIKE`, `TRANSPORT_HIGH`, `COMMERCE_SPIKE`, `CARBURANT_SPIKE`, `SANTE_HIGH`, `MOBILE_MONEY_HIGH`, `FEES_HIGH`, `INCOME_DROP`, `GOOD_HABIT`

### Le calcul matriciel

```typescript
// Pour chaque intention j :
score[j] = feature[0]×W[0][j] + feature[1]×W[1][j] + ... + feature[20]×W[20][j]
```

**Exemple concret — contexte LOGEMENT, percent=55 :**

```
featureVector = [1, 0, 0, ..., 0.55, 0.1, 0]
                 ↑                    ↑
           cat_LOGEMENT=1          percent=0.55

score LOGEMENT_CRITICAL = 1×1.5 + 0.55×1.0 + 0.1×0.1 = 2.05  ← activé (≥ 0.8)
score ALIMENTATION_SPIKE = 0×1.5 + 0.1×1.0           = 0.10  ← ignoré
score INCOME_DROP        = 0×1.5 + 0.1×(-1.0)        = -0.10 ← ignoré
```

### Architecture 2 couches (NLP)

Quand les descriptions de transactions sont disponibles, le système passe automatiquement en mode 2 couches :

```
FeatureVector (321 : 21 base + 300 embeddings)
    ↓
W1 (321 × 32 neurones)  ← couche cachée
    ↓
ReLU                    ← activation non-linéaire
    ↓
W2 (32 × 17 intents)    ← couche de sortie
    ↓
ScoredIntent[]
```

Les embeddings sont chargés depuis `data/embeddings/cc.fr.300.vec` (fastText français, 2M mots, 300 dimensions). Téléchargement via `scripts/download-embeddings.sh`.

### Fichiers du module

```
src/analytics/matrix/
├── types.ts                          # FeatureVector, WeightMatrix, DeepWeightMatrices
├── activation.ts                     # ReLU, softmax
├── context-vector.builder.ts         # RuleContext → vecteur (21 ou 321 dimensions)
├── intent-matrix.ts                  # Poids 21×17 + 321×32 + 32×17
├── scoring-engine.ts                 # computeScores (1 couche) + computeScoresDeep (2 couches)
├── matrix-interpreter.engine.ts      # Interpréteur (même interface que l'ancien)
├── matrix.module.ts                  # Module NestJS
└── index.ts                          # Barrel
```

---

## Module d'Entraînement — Descente de Gradient

Permet d'ajuster automatiquement les poids de la matrice à partir d'exemples `RuleContext → intention_validée`.

### Principe

L'algorithme utilise une **margin loss** (perte de marge) :

```
L = max(0, score_mauvaise - score_correcte + marge)

Si L > 0 :
  W[i][correcte] += learningRate × feature[i]   ← renforcer la bonne
  W[i][mauvaise]  -= learningRate × feature[i]   ← affaiblir la mauvaise
```

### Usage

```bash
# Entraînement 1 couche (poids par défaut)
npx ts-node src/scripts/train.ts --epochs 100

# Entraînement 2 couches (architecture NLP)
npx ts-node src/scripts/train.ts --epochs 200 --layers 2

# Paramètres custom
npx ts-node src/scripts/train.ts --epochs 50 --lr 0.05 --margin 1.0
```

### Format des données d'entraînement (`training-data.json`)

```json
[
  {
    "id": "ex-001",
    "context": {
      "category": "LOGEMENT",
      "percent": 55,
      "change": 10,
      "amount": 150000,
      "expenseRatio": 75,
      "prevAmount": 120000,
      "totalRevenue": 300000,
      "totalExpenses": 200000,
      "label": "Logement"
    },
    "expected": "LOGEMENT_CRITICAL"
  }
]
```

36 exemples pré-chargés couvrant les 17 intentions.

### Sortie

Le script modifie `src/analytics/matrix/trained-weights.ts` et affiche :

```
Étape    0 | Loss: 0.3736 | Accuracy: 75.0%
Étape   10 | Loss: 0.2548 | Accuracy: 83.3%
Étape   50 | Loss: 0.1241 | Accuracy: 91.7%
Étape  100 | Loss: 0.0845 | Accuracy: 94.4%

✅ Poids sauvegardés dans src/analytics/matrix/trained-weights.ts
```

### Fichiers du module

```
src/analytics/training/
├── types.ts                    # TrainingExample, TrainingConfig, TrainingResult
├── data-loader.ts              # Lecture/écriture de training-data.json
├── gradient-descent.ts         # Margin loss (1 ou 2 couches)
├── model-evaluator.ts          # Accuracy, Top-3, matrice de confusion
├── train-command.ts            # CLI NestJS
├── training.module.ts          # Module NestJS
└── src/scripts/train.ts        # Point d'entrée
```

---

## Module Embeddings — NLP sur les descriptions de transactions

### Principe

Chaque description de transaction (ex: "Paiement Orange Money", "Loyer novembre") est convertie en un vecteur de 300 nombres via fastText. Ces vecteurs s'ajoutent au vecteur de features (21 → 321) pour enrichir l'analyse.

### Téléchargement

```bash
chmod +x scripts/download-embeddings.sh
./scripts/download-embeddings.sh
```

Télécharge `cc.fr.300.vec` (~800MB) depuis [fastText](https://fasttext.cc/docs/en/crawl-vectors.html) vers `data/embeddings/`.

### Fonctionnement

- L'`EmbeddingLoader` charge le fichier `.vec` au démarrage de l'application
- Le `TextVectorizer` moyenne les embeddings de tous les mots d'une catégorie
- Les embeddings sont utilisés automatiquement si le fichier est présent

### Fichiers du module

```
src/analytics/embeddings/
├── embedding-loader.ts       # Chargement du .vec en mémoire
├── text-vectorizer.ts       # Descriptions → embedding moyen
└── embeddings.module.ts     # Module NestJS (Global)
```

---

## Vue d'ensemble de l'architecture analytique

```
┌──────────────────┐     ┌──────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   Transaction    │     │              │     │  MatrixInterpreter   │     │             │
│   Sources        │────▶│  AdviceEngine│────▶│  21→17 ou 321→32→17 │────▶│   Realizer  │
│   (DbSource,     │     │              │     │  + seuil 0.8         │     │  → Texte    │
│    TMoneySource) │     │              │     │                      │     │             │
└──────────────────┘     └──────────────┘     └──────────────────────┘     └─────────────┘
                                                         │
                                            ┌────────────▼───────────┐
                                            │   Training CLI          │
                                            │   npx ts-node .../train │
                                            │   ─ epochs 100          │
                                            │   ─ layers 1|2          │
                                            │   ─ lr 0.01             │
                                            └─────────────────────────┘
```

### Flow complet

1. **Sources** : `DbSource` + `TMoneySource` récupèrent les transactions
2. **AdviceEngine** : agrège par catégorie, calcule les métriques (percent, change...), crée les `RuleContext`
3. **MatrixInterpreter** : `RuleContext` → vecteur (21 ou 321 dimensions) → scores (17 intentions) → classement
4. **Realizer** : `AdviceIntent` → message humanisé (JSON catalog + templates)
5. **Training** (optionnel) : ajuste les poids de la matrice via descente de gradient sur des données labellisées
