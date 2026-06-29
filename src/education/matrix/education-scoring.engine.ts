import type { FeatureVector, WeightMatrix, ScoredAdviceType } from './types';
import { EDUCATION_ADVICE_TYPES, SCORE_THRESHOLD } from './education-intent-matrix';
import { relu } from './activation';

export function computeScores(
  featureVector: FeatureVector,
  weightMatrix: WeightMatrix,
): ScoredAdviceType[] {
  const numIntents = weightMatrix[0]?.length ?? 0;
  const scores: ScoredAdviceType[] = [];

  for (let col = 0; col < numIntents; col++) {
    let score = 0;
    for (let row = 0; row < featureVector.length; row++) {
      score += featureVector[row] * (weightMatrix[row]?.[col] ?? 0);
    }
    scores.push({
      kind: EDUCATION_ADVICE_TYPES[col] ?? `UNKNOWN_${col}`,
      score,
    });
  }

  return scores;
}

export function selectActiveAdviceTypes(
  scores: ScoredAdviceType[],
  threshold: number = SCORE_THRESHOLD,
): ScoredAdviceType[] {
  return scores
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

export function computeScoresDeep(
  featureVector: FeatureVector,
  W1: number[][],
  W2: number[][],
): ScoredAdviceType[] {
  const hiddenSize = W2.length;
  const numIntents = W2[0]?.length ?? 0;

  const hidden: number[] = [];
  for (let j = 0; j < hiddenSize; j++) {
    let sum = 0;
    for (let i = 0; i < featureVector.length; i++) {
      sum += featureVector[i] * (W1[i]?.[j] ?? 0);
    }
    hidden.push(relu(sum));
  }

  const scores: ScoredAdviceType[] = [];
  for (let col = 0; col < numIntents; col++) {
    let sum = 0;
    for (let row = 0; row < hidden.length; row++) {
      sum += hidden[row] * (W2[row]?.[col] ?? 0);
    }
    scores.push({
      kind: EDUCATION_ADVICE_TYPES[col] ?? `UNKNOWN_${col}`,
      score: sum,
    });
  }

  return scores;
}
