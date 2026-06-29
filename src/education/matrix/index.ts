export { EducationMatrixEngine } from './education-matrix.engine';
export { EducationMatrixModule } from './education-matrix.module';
export {
  buildEducationVector,
  EDUCATION_FEATURE_INDEX,
  EDUCATION_FEATURE_COUNT,
} from './education-context.builder';
export {
  buildEducationWeightMatrix,
  EDUCATION_ADVICE_TYPES,
  EDUCATION_ADVICE_INDEX,
  EDUCATION_ADVICE_COUNT,
} from './education-intent-matrix';
export {
  computeScores,
  selectActiveAdviceTypes,
} from './education-scoring.engine';
export { relu } from './activation';
export type {
  FeatureVector,
  WeightMatrix,
  ScoredAdviceType,
  FinancialMetrics,
} from './types';
