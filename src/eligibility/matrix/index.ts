export { EligibilityMatrixBuilder } from './eligibility-matrix.builder';
export { MatrixEligibilityEngine } from './matrix-eligibility.engine';
export {
  buildEligibilityVector,
  computeRuleSatisfaction,
} from './eligibility-context.builder';
export {
  scoreProduct,
  normalizedScoreToStatus,
} from './eligibility-scoring.engine';
export type { EligibilityMetrics, MatrixProduct, MatrixRule } from './types';
