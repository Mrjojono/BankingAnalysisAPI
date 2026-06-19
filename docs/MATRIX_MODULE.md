# Module Matriciel — Guide Complet

## Introduction

Ce module remplace les `if/else` de `interpreter.engine.ts` par un **calcul matriciel** (vecteur × matrice = scores). Le but : rendre le système plus flexible, plus facile à améliorer, et prêt pour le NLP.

Mais concrètement, qu'est-ce que ça veut dire ? Ce guide explique **avec des chiffres** comment ça marche.

---

## 1. Le problème : transformer du texte en maths

### L'ancien système (if/else)

```typescript
if (ctx.category === 'LOGEMENT' && ctx.percent > 50) {
  return { kind: 'LOGEMENT_CRITICAL', severity: 'WARNING' };
}
```

**Problème** : c'est figé. Le code dit "percent > 50", mais c'est écrit en dur. On ne peut pas apprendre un meilleur seuil à partir de données.

### Le nouveau système (matrice)

On remplace les seuils par des **poids** dans un tableau. Et la condition `if` devient une **multiplication**.

**L'idée en une phrase** : on représente le contexte (catégorie, pourcentage, variation...) comme une liste de nombres, on les multiplie par une grille de poids, et les résultats les plus hauts gagnent.

---

## 2. Le Feature Vector — transformer le contexte en nombres

Le `RuleContext` (ce que le système reçoit) ressemble à ça :

```typescript
const ctx = {
  category: 'LOGEMENT',    // ← texte
  percent: 55,             // ← nombre
  change: 10,              // ← nombre (+10%)
  amount: 150000,          // ← nombre
  expenseRatio: 75,        // ← nombre
  prevAmount: 120000,      // ← nombre
};
```

Pour qu'une matrice puisse le manipuler, on transforme TOUT en nombres. Surtout la catégorie qui est un texte.

### One-hot encoding : transformer "LOGEMENT" en nombres

On liste toutes les catégories possibles (16 en tout), et on met `1` à la position de la catégorie actuelle, `0` partout ailleurs :

```
Position :  0              1               2               3           ...  15
Catégorie : LOGEMENT   ALIMENTATION    TRANSPORT       SANTE        ...  LOISIRS
Valeur :    1           0               0               0            ...  0
```

Ça s'appelle le **one-hot encoding** : une seule case chaude (1), toutes les autres froides (0). C'est la façon standard de représenter des catégories en maths.

### Normalisation : mettre les nombres à la même échelle

Les features numériques (percent, change, amount...) n'ont pas les mêmes unités ni la même échelle. `percent` va de 0 à 100, `amount` peut aller jusqu'à plusieurs millions. Si on les met tels quels dans le vecteur, l'amount va tout écraser car il est 10 000 fois plus grand que le percent.

**Solution** : on normalise chaque feature entre -1 et 1 :

| Feature | Valeur brute | Normalisation | Valeur normalisée |
|---------|-------------|---------------|------------------|
| `percent` | 55 | ÷ 100 | **0.55** |
| `change` | 10 | ÷ 100 | **0.10** |
| `amount` | 150 000 | ÷ 1 000 000 | **0.15** |
| `expense_ratio` | 75 | ÷ 100 | **0.75** |
| `prev_amount` | 120 000 | ÷ 1 000 000 | **0.12** |

### Le vecteur final

```
[ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0.55,  0.10,  0.15,  0.75,  0.12  ]
  ↑                                                                 ↑     ↑      ↑      ↑     ↑
  cat_LOGEMENT=1                                                    pct  change amount ratio  prev
  (toutes les autres catégories à 0)                                     (10%)       75%    (120k)
                                                                        (55%)       (150k)
```

<details>
<summary>Les 21 cases du vecteur (clique pour voir)</summary>

| Index | Nom | Description |
|-------|-----|-------------|
| 0 | cat_LOGEMENT | 1 si LOGEMENT, sinon 0 |
| 1 | cat_ALIMENTATION | 1 si ALIMENTATION, sinon 0 |
| 2 | cat_TRANSPORT | 1 si TRANSPORT, sinon 0 |
| 3 | cat_SANTE | 1 si SANTE, sinon 0 |
| 4 | cat_MOBILE_MONEY | 1 si MOBILE_MONEY, sinon 0 |
| 5 | cat_CARBURANT | 1 si CARBURANT, sinon 0 |
| 6 | cat_COMMERCE | 1 si COMMERCE, sinon 0 |
| 7 | cat_FRAIS_BANCAIRES | 1 si FRAIS_BANCAIRES, sinon 0 |
| 8 | cat_VIREMENTS | 1 si VIREMENTS, sinon 0 |
| 9 | cat_RETRAITS | 1 si RETRAITS, sinon 0 |
| 10 | cat_DEPOTS | 1 si DEPOTS, sinon 0 |
| 11 | cat_INTERETS | 1 si INTERETS, sinon 0 |
| 12 | cat_CREDIT | 1 si CREDIT, sinon 0 |
| 13 | cat_SALAIRE | 1 si SALAIRE, sinon 0 |
| 14 | cat_DIVERS | 1 si DIVERS, sinon 0 |
| 15 | cat_LOISIRS | 1 si LOISIRS, sinon 0 |
| 16 | percent | Pourcentage normalisé (0-100 → 0.0-1.0) |
| 17 | change | Variation normalisée (-100% → -1.0, +100% → 1.0) |
| 18 | amount_ratio | Montant ÷ 1 000 000 |
| 19 | expense_ratio | Ratio dépenses/revenus normalisé |
| 20 | prev_amount_ratio | Montant précédent ÷ 1 000 000 |

</details>

---

## 3. La Weight Matrix — le cerveau du système

La matrice des poids est un **tableau à 2 dimensions** :
- **21 lignes** : une par feature (chaque case du vecteur)
- **17 colonnes** : une par intention possible (LOGEMENT_CRITICAL, ALIMENTATION_SPIKE...)

Chaque cellule contient un nombre qui représente **l'influence** de cette feature sur cette intention.

```
                          colonnes → 17 intentions
                         ┌──────────────────────────────────────────┐
                         │ LOGEMENT_    ALIMENTATION_    INCOME_    │
                         │ CRITICAL     SPIKE            DROP       │
                  ┌──────┼──────────────────────────────────────────┤
                  │cat   │                                           
lignes            │LOGMT │  1.5           0              0          
(21 features)     ├──────┼──────────────────────────────────────────┤
                  │cat   │                                          
                  │ALIM  │  0             1.5            0          
                  ├──────┼──────────────────────────────────────────┤
                  │...   │  ...           ...            ...        
                  ├──────┼──────────────────────────────────────────┤
                  │pct   │  1.0           0              0          
                  ├──────┼──────────────────────────────────────────┤
                  │change│  0             1.0            -1.0   ←  poids négatif !
                  ├──────┼──────────────────────────────────────────┤
                  │...   │  ...           ...            ...        
                  └──────┴──────────────────────────────────────────┘
```

### Comment lire une colonne

Prenons la colonne **LOGEMENT_CRITICAL** :

```
Ligne "cat_LOGEMENT"       → 1.5    (si c'est du logement, +1.5 au score)
Ligne "percent"            → 1.0    (si le ratio est élevé, +1.0 × percent au score)
Ligne "change"             → 0.1    (un tout petit effet)
Toutes les autres lignes   → 0      (pas d'effet)
```

C'est l'équivalent de la règle `if (category === 'LOGEMENT' && percent > 50)` — mais écrit en chiffres au lieu de code.

### Pourquoi des poids NÉGATIFS ?

Prenons **INCOME_DROP** (baisse de revenus) :

```
Ligne "cat_SALAIRE"  →  1.5   (il faut que ce soit un revenu)
Ligne "change"       → -1.0   (poids NÉGATIF)
```

Quand `change` est négatif (baisse de revenus) : **-0.30 × -1.0 = +0.30** → le score monte ✓

Quand `change` est positif (hausse de revenus) : **0.20 × -1.0 = -0.20** → le score descend ✓

Le poids négatif permet de dire "plus cette feature est PETITE, plus le score est GRAND". C'est impossible avec un simple `if/else` sans écrire explicitement la condition inverse.

### Pourquoi des poids forts (1.5) pour les catégories ?

Pour qu'une catégorie seule donne déjà un score de base de 1.5. Si `cat_LOGEMENT=1` et `percent=0.55`, le score de LOGEMENT_CRITICAL est déjà 1.5 + 0.55 = **2.05**. La catégorie est le "feu vert", les features numériques sont le "niveau d'alerte".

---

## 4. Le calcul : vecteur × matrice = scores

C'est le cœur. Il s'agit d'un **produit scalaire** pour chaque colonne.

### Définition

```
Pour chaque colonne j (intention) :

  score[j] = Σ ( vecteur[i] × matrice[i][j] )
           = vecteur[0] × matrice[0][j]
           + vecteur[1] × matrice[1][j]
           + vecteur[2] × matrice[2][j]
           + ...
           + vecteur[20] × matrice[20][j]
```

### Exemple concret

On reprend notre contexte : **LOGEMENT, percent=55, change=+10%, amount=150k**

```
vecteur = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0.55,  0.10,  0.15,  0,  0.12]
           ↑ cat LOGEMENT=1                                    ↑pct   ↑chg   ↑amt        ↑prev
```

**Étape 1 : Score de LOGEMENT_CRITICAL**

```
score = vecteur[0]  × 1.5     (cat_LOGEMENT × son poids)
      + vecteur[16] × 1.0     (percent × son poids)
      + vecteur[17] × 0.1     (change × son poids)
      + 0 × 0 + 0 × 0 + ...  (toutes les autres lignes = 0)

score = 1 × 1.5 + 0.55 × 1.0 + 0.10 × 0.1 + 0 + 0 + ...
      = 1.5     + 0.55       + 0.01
      = 2.06
```

**Étape 2 : Score de ALIMENTATION_SPIKE**

```
score = vecteur[1]  × 1.5     (cat_ALIMENTATION × son poids)
      + vecteur[17] × 1.0     (change × son poids)

score = 0 × 1.5 + 0.10 × 1.0
      = 0 + 0.10
      = 0.10
```

Pourquoi c'est bas ? Parce que `cat_ALIMENTATION = 0` (c'est du LOGEMENT, pas de l'ALIMENTATION). La catégorie ne correspond pas.

**Étape 3 : Score de INCOME_DROP**

```
score = vecteur[13] × 1.5     (cat_SALAIRE × son poids)
      + vecteur[17] × -1.0    (change × poids NÉGATIF)

score = 0 × 1.5 + 0.10 × (-1.0)
      = 0 + (-0.10)
      = -0.10
```

Négatif ! Pourquoi ? Parce que `change = +10%` (les revenus augmentent), donc la baisse de revenus n'est pas pertinente. Si `change avait été -30%` :

```
score = 0 × 1.5 + (-0.30) × (-1.0)
      = 0 + 0.30
      = 0.30
```

Positif cette fois. La baisse de revenus est détectée.

### Résultat complet (17 scores)

| Intention | Score | > 0.8 ? |
|-----------|-------|----------|
| **LOGEMENT_CRITICAL** | **2.06** | **✓ OUI** |
| LOGEMENT_HIGH | 1.78 | ✓ OUI |
| LOGEMENT_OK | 1.45 | ✓ OUI |
| CREDIT_HIGH | 0.55 | ✗ NON |
| ALIMENTATION_SPIKE | 0.10 | ✗ NON |
| INCOME_DROP | -0.10 | ✗ NON |
| ... | ... | ... |

### Pourquoi 3 intentions LOGEMENT gagnantes ?

Les 3 (CRITICAL, HIGH, OK) sont activées parce que `cat_LOGEMENT=1` donne déjà un score de base de 1.5. Mais elles sont **classées par score**. La meilleure (LOGEMENT_CRITICAL avec 2.06) est retournée en premier au `Realizer`, puis les autres.

C'est plus riche que l'ancien système qui ne retournait que la première condition qui matchait ! La matrice permet un **classement nuancé**.

---

## 5. Ce que la matrice peut faire que if/else ne peut pas

### 1. Détection multi-catégorie

Grâce à la matrice, **COMMERCE_SPIKE** s'active pour `cat_COMMERCE` OU `cat_DIVERS` :

```typescript
W[row('cat_COMMERCE')][col('COMMERCE_SPIKE')] = 1.5;
W[row('cat_DIVERS')][col('COMMERCE_SPIKE')] = 1.5;
```

Dans l'ancien système, c'était : `(cat === 'COMMERCE' || cat === 'DIVERS')`. Ici, c'est juste deux lignes de la matrice. Pour ajouter une 3e catégorie, on ajoute UNE LIGNE.

### 2. Pondération automatique

Si on veut que la variation ait PLUS d'impact que le pourcentage pour un certain type d'alerte, on met un poids plus grand sur `change`. Aucun `if/else` à réécrire.

### 3. Combinaisons complexes

Si demain on veut une alerte "LOGEMENT élevé ET revenus en baisse" :

```typescript
W[row('cat_LOGEMENT')][col('NOUVELLE_INTENTION')] = 1.5;
W[row('percent')][col('NOUVELLE_INTENTION')] = 1.0;
W[row('change')][col('NOUVELLE_INTENTION')] = -1.0; // baisse de revenus
```

Aucun `if` complexe. Juste 3 poids dans la matrice.

---

## 6. Préparation pour le NLP / Deep Learning

Le système matriciel actuel s'appelle un **réseau de neurones à 1 couche** (Single Layer Perceptron). Voici comment ça évolue :

### Architecture actuelle (1 couche)

```
[Features]  →  × MATRICE  →  [Scores]  →  [Intention choisie]
  21 entrées      17 sorties
```

Chaque feature est connectée à chaque intention avec un poids. C'est un réseau **complètement connecté** (fully connected) à 1 couche.

### Évolution vers 2 couches

```
[Features]  →  × MATRICE₁  →  [ReLU]  →  × MATRICE₂  →  [Scores]
  21 entrées      couche cachée                 sortie
                  (ex: 8 neurones)
```

La première couche crée des **concepts intermédiaires** (ex: `dépense_logement_excessive`, `bonne_santé_financière`, `risque_endettement`). La deuxième combine ces concepts pour choisir l'intention.

### Évolution vers du NLP

Pour que le système comprenne les **descriptions de transactions** (texte), on pourrait :

1. Ajouter des embeddings Word2Vec/fastText dans le vecteur (par ex. 300 dimensions par mot)
2. Le vecteur passerait de 21 features à 321 (21 chiffres + 300 embeddings)
3. La matrice passerait de `21×17` à `321×17`
4. Le système pourrait détecter : "Cette description ressemble à des frais bancaires, même si la catégorie est AUTRE"

L'interface `interpret(ctx) → AdviceIntent[]` ne changerait pas — juste la construction du vecteur et la taille de la matrice.

### Comment faire apprendre la matrice

Si on collecte des données : `(RuleContext, intention_validée_par_conseiller)`, on peut entraîner la matrice :

```
1. Pour chaque exemple : calculer le score
2. Comparer le résultat avec l'intention attendue
3. Calculer l'erreur
4. Ajuster les poids pour réduire l'erreur
5. Recommencer 1000 fois
```

C'est exactement la **descente de gradient** (gradient descent). Le code ne change pas — seuls les poids dans la matrice changent.

---

## 7. Schéma récapitulatif complet

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                   RuleContext                            │
                    │  { category: 'LOGEMENT', percent: 55, change: 10, ... } │
                    └────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │             buildFeatureVector(ctx)                      │
                    │                                                          │
                    │   one-hot          normalisation                         │
                    │   ┌──────┐        ┌──────────┐                          │
                    │   │LOGMT│→ 1     │ percent  │→ 0.55                     │
                    │   │ALIM │→ 0     │ change   │→ 0.10                     │
                    │   │TRANS│→ 0     │ amount   │→ 0.15                     │
                    │   │...  │→ 0     │ expense  │→ 0.75                     │
                    │   └──────┘        └──────────┘                          │
                    │                                                          │
                    │   Résultat : [1, 0, 0, ..., 0.55, 0.10, 0.15, 0.75]     │
                    └────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │             computeScores(vecteur, matrice)               │
                    │                                                          │
                    │   Pour chaque intention j :                              │
                    │                                                          │
                    │   score[j] = Σ(feature[i] × poids[i][j])                 │
                    │                                                          │
                    │   LOGEMENT_CRITICAL = 1×1.5 + 0.55×1.0 + 0.10×0.1 = 2.06│
                    │   ALIMENTATION_SPIKE = 0×1.5 + 0.10×1.0          = 0.10 │
                    │   INCOME_DROP        = 0×1.5 + 0.10×(-1.0)       = -0.10│
                    │   ...                                                    │
                    └────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │           selectActiveIntents(scores)                     │
                    │                                                          │
                    │   Seuil : score >= 0.8                                   │
                    │                                                          │
                    │   1. LOGEMENT_CRITICAL   2.06  ✓                         │
                    │   2. LOGEMENT_HIGH       1.78  ✓                         │
                    │   3. LOGEMENT_OK         1.45  ✓                         │
                    │   4. CREDIT_HIGH         0.55  ✗                         │
                    │   ...                                                    │
                    └────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │      scoredIntentToAdvice(scored, ctx)                    │
                    │                                                          │
                    │   kind: 'LOGEMENT_CRITICAL' → severity: 'WARNING'         │
                    │   vars: { amount: 150000, percent: 55, ... }              │
                    │   type: 'TOP_CATEGORY'                                    │
                    └────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │              AdviceIntent[] → Realizer                    │
                    │                                                          │
                    │   [ { kind: 'LOGEMENT_CRITICAL',                         │
                    │       severity: 'WARNING',                               │
                    │       title: 'Logement critique',                        │
                    │       message: 'Vous dépensez 55%...' },                 │
                    │     { kind: 'LOGEMENT_HIGH', ... } ]                     │
                    └─────────────────────────────────────────────────────────┘
```

---

## 8. Petit glossaire

| Terme | Définition simple |
|-------|------------------|
| **Vecteur** | Une liste de nombres (ex: `[1, 0, 0, 0.55]`) |
| **Matrice** | Un tableau de tableaux, une grille de nombres |
| **Feature** | Une propriété du contexte mise en chiffre (percent, category...) |
| **Poids** | Un nombre dans la matrice qui dit "à quel point cette feature compte pour cette intention" |
| **Produit scalaire** | `somme_de(a[i] × b[i])` — la façon de multiplier un vecteur par un autre |
| **One-hot encoding** | Représenter une catégorie en mettant 1 à sa position, 0 ailleurs |
| **Normalisation** | Mettre tous les nombres à la même échelle (entre -1 et 1) |
| **Score** | Le résultat du calcul pour une intention. Plus c'est haut, plus l'intention est pertinente |
| **Seuil (threshold)** | En dessous de ce score, l'intention est ignorée |
| **Couche (layer)** | Une étape de calcul dans un réseau de neurones. 1 couche = 1 multiplication |
| **Descente de gradient** | Technique qui ajuste les poids pour que les prédictions correspondent aux données |

---

## 9. Fichiers du module

```
src/analytics/matrix/
├── types.ts                          # Les types (FeatureVector, WeightMatrix, etc.)
├── context-vector.builder.ts         # RuleContext → vecteur de nombres
├── intent-matrix.ts                  # La matrice des poids
├── scoring-engine.ts                 # Vecteur × Matrice = scores → tri
├── matrix-interpreter.engine.ts      # L'interpréteur (même interface que l'ancien)
├── matrix.module.ts                  # Module NestJS
└── index.ts                          # Barrel file
```

Un seul fichier modifié : `analytics.module.ts` (ajout du `useClass` pour remplacer l'interpréteur).
