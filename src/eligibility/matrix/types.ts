import type { Rule } from '../../../generated/prisma/client';

export type EligibilityMetrics = {
  monthlyIncome: number;
  monthlyExpenses: number;
  expenseRatioScore: number;
  expenseRatio: number;
  paymentRegularityScore: number;
  debtRatioScore: number;
  debtRatio: number;
  repaymentRegularityScore: number;
  creditUtilizationScore: number;
  savingsRateScore: number;
  savingsRate: number;
  emergencyFundScore: number;
  savingsRegularityScore: number;
  overdraftScore: number;
  overdraftDays: number;
  revenueVolatilityScore: number;
  balanceVolatilityScore: number;
  globalScore: number;
};

export type MatrixRule = Pick<
  Rule,
  | 'id'
  | 'code'
  | 'label'
  | 'field'
  | 'operator'
  | 'value'
  | 'valueMin'
  | 'valueMax'
  | 'weight'
>;

export type MatrixProduct = {
  code: string;
  name: string;
  description: string | null;
  rules: MatrixRule[];
};

export type EligibilityCache = {
  products: MatrixProduct[];
  builtAt: string;
};
