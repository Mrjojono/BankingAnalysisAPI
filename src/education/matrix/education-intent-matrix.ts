import type { WeightMatrix, FeatureIndex } from './types';
import {
  EDUCATION_FEATURE_INDEX,
  EDUCATION_FEATURE_COUNT,
} from './education-context.builder';

export const EDUCATION_ADVICE_TYPES = [
  'SAVINGS_LOW',
  'SAVINGS_OK',
  'EXPENSE_HIGH',
  'EXPENSE_OK',
  'DEBT_HIGH',
  'DEBT_MODERATE',
  'DEBT_OK',
  'OVERDRAFT_FREQUENT',
  'OVERDRAFT_OK',
  'REVENUE_UNSTABLE',
  'REVENUE_STABLE',
  'SCORE_LOW',
  'SCORE_MEDIUM',
  'SCORE_HIGH',
  'BUDGET_NEEDED',
  'EMERGENCY_FUND',
] as const;

export const EDUCATION_ADVICE_COUNT = EDUCATION_ADVICE_TYPES.length;

export const EDUCATION_ADVICE_INDEX: Record<string, number> = {};
EDUCATION_ADVICE_TYPES.forEach((name, idx) => {
  EDUCATION_ADVICE_INDEX[name] = idx;
});

export const SCORE_THRESHOLD = 0.8;

export function buildEducationWeightMatrix(): WeightMatrix {
  const W: WeightMatrix = Array.from({ length: EDUCATION_FEATURE_COUNT }, () =>
    new Array(EDUCATION_ADVICE_COUNT).fill(0),
  );

  const col = (name: string) => EDUCATION_ADVICE_INDEX[name];
  const row = EDUCATION_FEATURE_INDEX;

  W[row.savings_rate][col('SAVINGS_LOW')] = -1.5;
  W[row.savings_score][col('SAVINGS_LOW')] = -1.0;
  W[row.overdraft_frequency][col('SAVINGS_LOW')] = 0.5;

  W[row.savings_rate][col('SAVINGS_OK')] = 1.5;
  W[row.savings_score][col('SAVINGS_OK')] = 1.0;
  W[row.global_score][col('SAVINGS_OK')] = 0.3;

  W[row.expense_ratio][col('EXPENSE_HIGH')] = 1.5;
  W[row.expense_score][col('EXPENSE_HIGH')] = -1.0;
  W[row.global_score][col('EXPENSE_HIGH')] = -0.3;

  W[row.expense_ratio][col('EXPENSE_OK')] = -0.5;
  W[row.expense_score][col('EXPENSE_OK')] = 1.0;

  W[row.debt_ratio][col('DEBT_HIGH')] = 1.5;
  W[row.debt_score][col('DEBT_HIGH')] = -1.0;

  W[row.debt_ratio][col('DEBT_MODERATE')] = 0.5;
  W[row.debt_score][col('DEBT_MODERATE')] = 0.3;

  W[row.debt_ratio][col('DEBT_OK')] = -1.0;
  W[row.debt_score][col('DEBT_OK')] = 1.5;

  W[row.overdraft_frequency][col('OVERDRAFT_FREQUENT')] = 1.5;
  W[row.stability_score][col('OVERDRAFT_FREQUENT')] = -0.5;

  W[row.overdraft_frequency][col('OVERDRAFT_OK')] = -1.0;
  W[row.stability_score][col('OVERDRAFT_OK')] = 1.0;

  W[row.revenue_stability][col('REVENUE_UNSTABLE')] = -1.5;
  W[row.overdraft_frequency][col('REVENUE_UNSTABLE')] = 0.5;

  W[row.revenue_stability][col('REVENUE_STABLE')] = 1.5;

  W[row.global_score][col('SCORE_LOW')] = -1.5;
  W[row.savings_score][col('SCORE_LOW')] = -0.3;
  W[row.debt_score][col('SCORE_LOW')] = -0.3;

  W[row.global_score][col('SCORE_MEDIUM')] = 0.3;
  W[row.global_score][col('SCORE_HIGH')] = 1.5;
  W[row.savings_score][col('SCORE_HIGH')] = 0.5;
  W[row.debt_score][col('SCORE_HIGH')] = 0.5;

  W[row.expense_ratio][col('BUDGET_NEEDED')] = 0.5;
  W[row.overdraft_frequency][col('BUDGET_NEEDED')] = 0.5;
  W[row.global_score][col('BUDGET_NEEDED')] = -0.5;

  W[row.savings_rate][col('EMERGENCY_FUND')] = -1.5;
  W[row.savings_score][col('EMERGENCY_FUND')] = -1.0;
  W[row.global_score][col('EMERGENCY_FUND')] = -0.5;

  return W;
}
