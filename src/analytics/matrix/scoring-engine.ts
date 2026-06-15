import type { FeatureVector, WeightMatrix, ScoredIntent } from './types';
import { INTENTS } from './intent-matrix';
import { relu } from './activation';

/**
 * Seuil minimum pour qu'une intention soit considérée comme "active".
 * En dessous de ce score, l'intention est ignorée.
 *
 * @description
 * Ce seuil évite les faux positifs. Si aucune feature pertinente n'est activée,
 * le score reste proche de 0 et l'intention ne se déclenche pas.
 */
export const SCORE_THRESHOLD = 0.8;

/**
 * Multiplie le vecteur de features par la matrice des poids.
 * C'est le CŒUR du calcul matriciel.
 *
 * @example
 * ```typescript
 * // Vecteur : [1, 0, 0, ..., 0.55, 0.1, ...] (21 features)
 * // Matrice : [21 lignes] × [17 colonnes]
 * //
 * // Résultat : pour chaque colonne (intention), on calcule :
 * // score[j] = feature[0]×W[0][j] + feature[1]×W[1][j] + ... + feature[20]×W[20][j]
 * //
 * // Retour : [ { kind: 'LOGEMENT_CRITICAL', score: 2.05 },
 * //            { kind: 'LOGEMENT_HIGH', score: 1.25 }, ... ]
 * ```
 */
export function computeScores(
  featureVector: FeatureVector,
  weightMatrix: WeightMatrix,
): ScoredIntent[] {
  const numIntents = weightMatrix[0]?.length ?? 0;
  const scores: ScoredIntent[] = [];

  for (let col = 0; col < numIntents; col++) {
    let score = 0;

    // Produit scalaire : somme de (feature[i] × poids[i][col])
    for (let row = 0; row < featureVector.length; row++) {
      score += featureVector[row] * (weightMatrix[row]?.[col] ?? 0);
    }

    scores.push({
      kind: INTENTS[col] ?? `UNKNOWN_${col}`,
      score,
    });
  }

  return scores;
}

/**
 * Filtre les intentions dont le score dépasse le seuil,
 * puis les trie par score décroissant (meilleur score en premier).
 *
 * @example
 * ```typescript
 * const actives = selectActiveIntents(scores);
 * // Retour : [ { kind: 'LOGEMENT_CRITICAL', score: 2.05 },
 * //            { kind: 'LOGEMENT_HIGH', score: 1.25 } ]
 * // (les scores < 0.8 sont ignorés)
 * ```
 */
export function selectActiveIntents(
  scores: ScoredIntent[],
  threshold: number = SCORE_THRESHOLD,
): ScoredIntent[] {
  return scores
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

/**
 * Forward pass pour une architecture 2 couches (avec ReLU).
 *
 * 1. hidden = ReLU(vecteur × W1)
 * 2. scores = hidden × W2
 *
 * Utile quand on a des embeddings NLP (vecteur > 21 dimensions).
 */
export function computeScoresDeep(
  featureVector: FeatureVector,
  W1: number[][],
  W2: number[][],
): ScoredIntent[] {
  const hiddenSize = W2.length;
  const numIntents = W2[0]?.length ?? 0;

  // Couche 1 : hidden = ReLU(vecteur × W1)
  const hidden: number[] = [];
  for (let j = 0; j < hiddenSize; j++) {
    let sum = 0;
    for (let i = 0; i < featureVector.length; i++) {
      sum += featureVector[i] * (W1[i]?.[j] ?? 0);
    }
    hidden.push(relu(sum));
  }

  // Couche 2 : scores = hidden × W2
  const scores: ScoredIntent[] = [];
  for (let col = 0; col < numIntents; col++) {
    let sum = 0;
    for (let row = 0; row < hidden.length; row++) {
      sum += hidden[row] * (W2[row]?.[col] ?? 0);
    }

    scores.push({
      kind: INTENTS[col] ?? `UNKNOWN_${col}`,
      score: sum,
    });
  }

  return scores;
}
