import type { RuleContext } from '../engines/interpreter.engine';
import type { FeatureVector, FeatureIndex } from './types';
import { EMBEDDING_DIM } from '../embeddings/embedding-loader';

/**
 * Toutes les catégories possibles, dans l'ordre.
 * Chaque catégorie devient une case du vecteur (one-hot encoding).
 */
export const CATEGORIES = [
  'LOGEMENT',
  'ALIMENTATION',
  'TRANSPORT',
  'SANTE',
  'MOBILE_MONEY',
  'CARBURANT',
  'COMMERCE',
  'FRAIS_BANCAIRES',
  'VIREMENTS',
  'RETRAITS',
  'DEPOTS',
  'INTERETS',
  'CREDIT',
  'SALAIRE',
  'DIVERS',
] as const;

/**
 * Index de chaque feature dans le vecteur.
 * Utile pour lire/écrire les poids dans la matrice.
 *
 * @example
 * ```typescript
 * const idx = FEATURE_INDEX.percent;        // 16
 * vector[idx] = ctx.percent / 100;
 * ```
 */
export const FEATURE_INDEX: FeatureIndex = {
  // One-hot catégories : position 0 à 14
  cat_LOGEMENT: 0,
  cat_ALIMENTATION: 1,
  cat_TRANSPORT: 2,
  cat_SANTE: 3,
  cat_MOBILE_MONEY: 4,
  cat_CARBURANT: 5,
  cat_COMMERCE: 6,
  cat_FRAIS_BANCAIRES: 7,
  cat_VIREMENTS: 8,
  cat_RETRAITS: 9,
  cat_DEPOTS: 10,
  cat_INTERETS: 11,
  cat_CREDIT: 12,
  cat_SALAIRE: 13,
  cat_DIVERS: 14,

  // Features numériques : position 15 à 19
  percent: 15,
  change: 16,
  amount_ratio: 17,
  expense_ratio: 18,
  prev_amount_ratio: 19,
};

/** Nombre total de features dans le vecteur (sans embeddings) */
export const FEATURE_COUNT = Object.keys(FEATURE_INDEX).length; // 20

/**
 * Nombre total de features AVEC embeddings NLP.
 * 20 features de base + 300 dimensions d'embedding.
 */
export const TOTAL_FEATURE_COUNT = FEATURE_COUNT + EMBEDDING_DIM; // 320

/**
 * Index où commence la zone d'embedding dans le vecteur.
 */
export const EMBEDDING_START = FEATURE_COUNT; // 20

/**
 * Transforme un contexte financier en vecteur numérique.
 *
 * Chaque feature est normalisée entre 0 et 1 pour que
 * la matrice de poids puisse les comparer équitablement.
 *
 * @param embeddingVector - Optionnel, vecteur d'embedding NLP (300 dimensions).
 *   Si fourni, le vecteur total fait 321 dimensions. Sinon, 21 dimensions.
 *
 * @example
 * ```typescript
 * const ctx: RuleContext = {
 *   category: 'LOGEMENT',
 *   percent: 55,
 *   change: 10,
 *   amount: 150000,
 *   ...
 * };
 * const vector = buildFeatureVector(ctx);
 * // Résultat : [1, 0, 0, ..., 0.55, 0.1, 0.15, 0.75, 0.1]
 * //           ↑          ↑percent ↑change ↑amount ↑expense ↑prevAmount
 * //           cat=LOGEMENT (one-hot)
 * ```
 */
export function buildFeatureVector(
  ctx: RuleContext,
  embeddingVector?: Float32Array,
): FeatureVector {
  const size = embeddingVector ? TOTAL_FEATURE_COUNT : FEATURE_COUNT;
  const vec = new Array(size).fill(0);

  // ── 1. One-hot encoding de la catégorie ──
  // Une seule case à 1, toutes les autres à 0
  const catKey = `cat_${ctx.category}`;
  const catIdx = FEATURE_INDEX[catKey];
  if (catIdx !== undefined) {
    vec[catIdx] = 1;
  }

  // ── 2. Features numériques normalisées ──
  // percent : 0% → 100% devient 0.0 → 1.0
  vec[FEATURE_INDEX.percent] = Math.min(ctx.percent / 100, 1);

  // change : -100% → +100% devient -1.0 → 1.0
  // Si null, on met 0 (aucun changement)
  vec[FEATURE_INDEX.change] =
    ctx.change !== null ? Math.max(-1, Math.min(ctx.change / 100, 1)) : 0;

  // amount_ratio : montant / 1 000 000 (pour rester entre 0 et 1)
  vec[FEATURE_INDEX.amount_ratio] = Math.min(ctx.amount / 1_000_000, 1);

  // expense_ratio : 0% → 100% devient 0.0 → 1.0
  vec[FEATURE_INDEX.expense_ratio] = Math.min(ctx.expenseRatio / 100, 1);

  // prev_amount_ratio : montant précédent normalisé
  vec[FEATURE_INDEX.prev_amount_ratio] = Math.min(
    ctx.prevAmount / 1_000_000,
    1,
  );

  // ── 3. Embeddings NLP (si disponibles) ──
  if (embeddingVector) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vec[EMBEDDING_START + i] = embeddingVector[i] ?? 0;
    }
  }

  return vec;
}
