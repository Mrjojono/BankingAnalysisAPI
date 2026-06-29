export type FeatureVector = number[];

export type WeightMatrix = number[][];

export type FeatureIndex = Record<string, number>;

export type ScoredAdviceType = {
  kind: string;
  score: number;
};

export type FinancialMetrics = {
  expenseRatio: number;
  savingsRate: number;
  debtRatio: number;
  overdraftDays: number;
  revenueVolatilityScore: number;
  globalScore: number;
  expenseRatioScore: number;
  savingsRateScore: number;
  debtRatioScore: number;
  balanceVolatilityScore: number;
  quizCompletionRate: number;
  lessonsCompleted: number;
};
