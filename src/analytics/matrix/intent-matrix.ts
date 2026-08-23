import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WeightMatrix, IntentIndex, DeepWeightMatrices } from './types';
import {
  FEATURE_COUNT,
  TOTAL_FEATURE_COUNT,
  FEATURE_INDEX,
} from './context-vector.builder';

/**
 * Toutes les intentions possibles, dans l'ordre.
 * Chaque colonne de la matrice correspond à l'une d'elles.
 */
export const INTENTS = [
  'LOGEMENT_CRITICAL',
  'LOGEMENT_HIGH',
  'LOGEMENT_OK',
  'CREDIT_HIGH',
  'CREDIT_NEAR_LIMIT',
  'CREDIT_INCREASE',
  'ALIMENTATION_SPIKE',
  'ALIMENTATION_HIGH',
  'TRANSPORT_SPIKE',
  'TRANSPORT_HIGH',
  'COMMERCE_SPIKE',
  'CARBURANT_SPIKE',
  'SANTE_HIGH',
  'MOBILE_MONEY_HIGH',
  'FEES_HIGH',
  'INCOME_DROP',
  'GOOD_HABIT',
] as const;

/** Nombre total d'intentions */
export const INTENT_COUNT = INTENTS.length;

/**
 * Index de chaque intention dans la matrice (quelle colonne).
 *
 * @example
 * ```typescript
 * const col = INTENT_INDEX.LOGEMENT_HIGH; // 1
 * scores[col] // score pour LOGEMENT_HIGH
 * ```
 */
export const INTENT_INDEX: IntentIndex = {};
INTENTS.forEach((name, idx) => {
  INTENT_INDEX[name] = idx;
});

/**
 * ─── Matrice des poids ──────────────────────────────────────────
 *
 * Dimensions : [FEATURE_COUNT] × [INTENT_COUNT]
 *   → 21 features (lignes) × 17 intentions (colonnes)
 *
 * Chaque colonne = une intention (LOGEMENT_CRITICAL, ALIMENTATION_SPIKE...)
 * Chaque ligne   = une feature (cat_LOGEMENT, percent, change...)
 * Chaque cellule = poids de cette feature pour cette intention
 *
 * Principe de lecture :
 *   score = Σ (feature[i] × poids[i][col])
 *
 * Un poids POSITIF signifie : + la feature est élevée, + le score monte
 * Un poids NÉGATIF signifie : + la feature est élevée, + le score descend
 *
 * @example Pour LOGEMENT_CRITICAL :
 *   cat_LOGEMENT = 1.5 (forte activation si c'est du logement)
 *   percent      = 1.0 (plus le ratio est élevé, plus c'est critique)
 *   change       = 0.0 (peu importe la variation)
 *
 *   Si cat=LOGEMENT(1) et percent=55%(0.55) :
 *   score = 1.5 × 1 + 1.0 × 0.55 = 2.05 ✓
 *
 *   Si cat=ALIMENTATION(1) et percent=55%(0.55) :
 *   score = 0.0 × 1 + 1.0 × 0.55 = 0.55 ✗ (LOGEMENT_CRITICAL pas activé)
 */
export function buildWeightMatrix(): WeightMatrix {
  const W: WeightMatrix = Array.from({ length: FEATURE_COUNT }, () =>
    new Array(INTENT_COUNT).fill(0),
  );

  // Utilitaires pour remplir la matrice plus lisiblement
  const col = (name: string) => INTENT_INDEX[name];
  const row = (name: string) => FEATURE_INDEX[name];

  // ─── 1. LOGEMENT_CRITICAL (percent > 50) ───
  W[row('cat_LOGEMENT')][col('LOGEMENT_CRITICAL')] = 1.5;
  W[row('percent')][col('LOGEMENT_CRITICAL')] = 1.0;
  W[row('change')][col('LOGEMENT_CRITICAL')] = 0.1;

  // ─── 2. LOGEMENT_HIGH (percent >= 35 et <= 50) ───
  W[row('cat_LOGEMENT')][col('LOGEMENT_HIGH')] = 1.5;
  W[row('percent')][col('LOGEMENT_HIGH')] = 0.5;
  W[row('change')][col('LOGEMENT_HIGH')] = 0.1;

  // ─── 3. LOGEMENT_OK (percent < 35 et > 0) ───
  W[row('cat_LOGEMENT')][col('LOGEMENT_OK')] = 1.5;
  W[row('percent')][col('LOGEMENT_OK')] = -0.5;
  W[row('change')][col('LOGEMENT_OK')] = 0.1;

  // ─── 4. CREDIT_HIGH (percent > 33) ───
  W[row('cat_CREDIT')][col('CREDIT_HIGH')] = 1.5;
  W[row('percent')][col('CREDIT_HIGH')] = 1.0;

  // ─── 5. CREDIT_NEAR_LIMIT (percent entre 28 et 33) ───
  W[row('cat_CREDIT')][col('CREDIT_NEAR_LIMIT')] = 1.5;
  W[row('percent')][col('CREDIT_NEAR_LIMIT')] = 0.5;

  // ─── 6. CREDIT_INCREASE (change > 20%) ───
  W[row('cat_CREDIT')][col('CREDIT_INCREASE')] = 1.5;
  W[row('change')][col('CREDIT_INCREASE')] = 1.0;

  // ─── 7. ALIMENTATION_SPIKE (change > 30%) ───
  W[row('cat_ALIMENTATION')][col('ALIMENTATION_SPIKE')] = 1.5;
  W[row('change')][col('ALIMENTATION_SPIKE')] = 1.0;

  // ─── 8. ALIMENTATION_HIGH (percent > 30) ───
  W[row('cat_ALIMENTATION')][col('ALIMENTATION_HIGH')] = 1.5;
  W[row('percent')][col('ALIMENTATION_HIGH')] = 1.0;

  // ─── 9. TRANSPORT_SPIKE (change > 30%) ───
  W[row('cat_TRANSPORT')][col('TRANSPORT_SPIKE')] = 1.5;
  W[row('change')][col('TRANSPORT_SPIKE')] = 1.0;

  // ─── 10. TRANSPORT_HIGH (percent > 15) ───
  W[row('cat_TRANSPORT')][col('TRANSPORT_HIGH')] = 1.5;
  W[row('percent')][col('TRANSPORT_HIGH')] = 1.0;

  // ─── 11. COMMERCE_SPIKE (COMMERCE ou DIVERS, change > 30%) ───
  W[row('cat_COMMERCE')][col('COMMERCE_SPIKE')] = 1.5;
  W[row('cat_DIVERS')][col('COMMERCE_SPIKE')] = 1.5;
  W[row('change')][col('COMMERCE_SPIKE')] = 1.0;

  // ─── 12. CARBURANT_SPIKE (change > 20%) ───
  W[row('cat_CARBURANT')][col('CARBURANT_SPIKE')] = 1.5;
  W[row('change')][col('CARBURANT_SPIKE')] = 1.0;

  // ─── 13. SANTE_HIGH (change > 50%) ───
  W[row('cat_SANTE')][col('SANTE_HIGH')] = 1.5;
  W[row('change')][col('SANTE_HIGH')] = 1.0;

  // ─── 14. MOBILE_MONEY_HIGH (change > 50%) ───
  W[row('cat_MOBILE_MONEY')][col('MOBILE_MONEY_HIGH')] = 1.5;
  W[row('change')][col('MOBILE_MONEY_HIGH')] = 1.0;

  // ─── 15. FEES_HIGH (amount > 10 000 FCFA) ───
  W[row('cat_FRAIS_BANCAIRES')][col('FEES_HIGH')] = 1.5;
  W[row('amount_ratio')][col('FEES_HIGH')] = 1.0;

  // ─── 16. INCOME_DROP (change < -20%) ───
  // Poids NÉGATIF sur change : si change est négatif, le score monte
  W[row('cat_SALAIRE')][col('INCOME_DROP')] = 1.5;
  W[row('change')][col('INCOME_DROP')] = -1.0;

  // ─── 17. GOOD_HABIT (change >= 0, expenseRatio < 65%, cat=ALIMENTATION) ───
  // Poids NÉGATIF sur expense_ratio : plus il est bas, plus le score monte (seuil 65%)
  W[row('cat_ALIMENTATION')][col('GOOD_HABIT')] = 1.0;
  W[row('change')][col('GOOD_HABIT')] = 1.0;
  W[row('expense_ratio')][col('GOOD_HABIT')] = -0.8;

  return W;
}

/**
 * ─── Matrices 2 couches (entrée → cachée → intentions) ─────────
 *
 * W1 : [TOTAL_FEATURE_COUNT] × [HIDDEN_SIZE]
 *   - Les 21 premières lignes reprennent les poids de buildWeightMatrix()
 *   - Les 300 lignes suivantes (embeddings) sont initialisées avec de petits aléas
 *
 * W2 : [HIDDEN_SIZE] × [INTENT_COUNT]
 *   - Initialisée pour reproduire approximativement le comportement 1 couche
 *
 * @param hiddenSize - Nombre de neurones dans la couche cachée (défaut: 32)
 */
export function buildWeightMatricesDeep(hiddenSize = 32): DeepWeightMatrices {
  const W1: number[][] = Array.from({ length: TOTAL_FEATURE_COUNT }, () =>
    new Array(hiddenSize).fill(0),
  );
  const W2: number[][] = Array.from({ length: hiddenSize }, () =>
    new Array(INTENT_COUNT).fill(0),
  );

  for (let j = 0; j < INTENT_COUNT; j++) {
    W2[0][j] = 1.0;
  }

  // On étale les poids de la matrice 1 couche sur les premiers neurones cachés
  const single = buildWeightMatrix();
  for (let i = 0; i < FEATURE_COUNT; i++) {
    for (let j = 0; j < INTENT_COUNT; j++) {
      W1[i][j % hiddenSize] += (single[i]?.[j] ?? 0) * 0.5;
      W1[i][(j + 1) % hiddenSize] += (single[i]?.[j] ?? 0) * 0.5;
    }
  }

  // W2 : chaque neurone caché propage les features de base
  for (let h = 0; h < hiddenSize && h < FEATURE_COUNT; h++) {
    for (let j = 0; j < INTENT_COUNT; j++) {
      W2[h][j] = 1.0;
    }
  }

  // Initialisation des poids embedding (He initialization)
  const stddev = Math.sqrt(2 / TOTAL_FEATURE_COUNT);
  for (let i = FEATURE_COUNT; i < TOTAL_FEATURE_COUNT; i++) {
    for (let h = 0; h < hiddenSize; h++) {
      W1[i][h] = (Math.random() * 2 - 1) * stddev;
    }
  }

  return { W1, W2, hiddenSize };
}

/**
 * Charge les poids entraînés s'ils existent, sinon utilise les poids par défaut.
 * Pour l'instant, retourne buildWeightMatrix(). Après entraînement,
 * les poids seront chargés depuis trained-weights.ts.
 */
export function loadOrBuildWeights(): WeightMatrix {
  const trainedPath = resolve(__dirname, 'trained-weights.ts');
  if (existsSync(trainedPath)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const trained = require('./trained-weights');
      if (trained?.TRAINED_WEIGHTS) {
        console.log('[IntentMatrix] Poids entraînés chargés.');
        return trained.TRAINED_WEIGHTS;
      }
    } catch {
      // Fichier corrompu ou invalide, on utilise les poids par défaut
    }
  }
  return buildWeightMatrix();
}
