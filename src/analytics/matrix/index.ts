/**
 * Barrel file du module matriciel.
 *
 * Le module matriciel remplace la logique if/else de
 * InterpreterEngine par un calcul : vecteur × matrice = scores.
 *
 * Usage :
 * ```typescript
 * import { MatrixInterpreterEngine } from './matrix';
 * ```
 */
export { MatrixInterpreterEngine } from './matrix-interpreter.engine';
export { MatrixModule } from './matrix.module';
export {
  buildFeatureVector,
  FEATURE_INDEX,
  TOTAL_FEATURE_COUNT,
  EMBEDDING_START,
} from './context-vector.builder';
export {
  buildWeightMatrix,
  buildWeightMatricesDeep,
  loadOrBuildWeights,
  INTENTS,
  INTENT_INDEX,
} from './intent-matrix';
export {
  computeScores,
  computeScoresDeep,
  selectActiveIntents,
} from './scoring-engine';
export { relu, reluDerivative, softmax } from './activation';
export type {
  FeatureVector,
  WeightMatrix,
  HiddenWeights,
  OutputWeights,
  DeepWeightMatrices,
  ScoredIntent,
} from './types';
