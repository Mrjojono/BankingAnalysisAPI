import type { FinancialMetrics, FeatureVector, FeatureIndex } from './types';

export const EDUCATION_FEATURE_INDEX: FeatureIndex = {
  expense_ratio: 0,
  savings_rate: 1,
  debt_ratio: 2,
  overdraft_frequency: 3,
  revenue_stability: 4,
  global_score: 5,
  expense_score: 6,
  savings_score: 7,
  debt_score: 8,
  stability_score: 9,
  quiz_completion_rate: 10,
  lessons_completed: 11,
};

export const EDUCATION_FEATURE_COUNT = Object.keys(
  EDUCATION_FEATURE_INDEX,
).length;

export function buildEducationVector(metrics: FinancialMetrics): FeatureVector {
  const vec = new Array(EDUCATION_FEATURE_COUNT).fill(0);

  vec[EDUCATION_FEATURE_INDEX.expense_ratio] = clamp(
    metrics.expenseRatio / 100,
  );
  vec[EDUCATION_FEATURE_INDEX.savings_rate] = clamp(metrics.savingsRate / 100);
  vec[EDUCATION_FEATURE_INDEX.debt_ratio] = clamp(metrics.debtRatio / 100);
  vec[EDUCATION_FEATURE_INDEX.overdraft_frequency] = clamp(
    metrics.overdraftDays / 31,
  );
  vec[EDUCATION_FEATURE_INDEX.revenue_stability] = clamp(
    metrics.revenueVolatilityScore / 100,
  );
  vec[EDUCATION_FEATURE_INDEX.global_score] = clamp(metrics.globalScore / 100);
  vec[EDUCATION_FEATURE_INDEX.expense_score] = clamp(
    metrics.expenseRatioScore / 100,
  );
  vec[EDUCATION_FEATURE_INDEX.savings_score] = clamp(
    metrics.savingsRateScore / 100,
  );
  vec[EDUCATION_FEATURE_INDEX.debt_score] = clamp(metrics.debtRatioScore / 100);
  vec[EDUCATION_FEATURE_INDEX.stability_score] = clamp(
    metrics.balanceVolatilityScore / 100,
  );
  vec[EDUCATION_FEATURE_INDEX.quiz_completion_rate] = clamp(
    metrics.quizCompletionRate ?? 0,
  );
  vec[EDUCATION_FEATURE_INDEX.lessons_completed] = clamp(
    (metrics.lessonsCompleted ?? 0) / 20,
  );

  return vec;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
