import type { EligibilityMetrics } from './types';

export const ELIGIBILITY_FEATURE_INDEX = {
  debtRatio: 0,
  monthlyIncome: 1,
  overdraftDays: 2,
  savingsRegularity: 3,
  expenseRatio: 4,
  repaymentRegularity: 5,
  revenueVolatility: 6,
  emergencyFund: 7,
  balanceVolatility: 8,
  savingsRate: 9,
  globalScore: 10,
  depositAmount: 11,
} as const;

export const ELIGIBILITY_FEATURE_COUNT = Object.keys(
  ELIGIBILITY_FEATURE_INDEX,
).length;

export function buildEligibilityVector(
  metrics: EligibilityMetrics,
  clientInputs: Record<string, number | boolean | string>,
): Float64Array {
  const vec = new Float64Array(ELIGIBILITY_FEATURE_COUNT);

  vec[ELIGIBILITY_FEATURE_INDEX.debtRatio] = clamp(metrics.debtRatio / 100);
  vec[ELIGIBILITY_FEATURE_INDEX.monthlyIncome] = clamp(
    metrics.monthlyIncome / 5_000_000,
  );
  vec[ELIGIBILITY_FEATURE_INDEX.overdraftDays] = clamp(
    metrics.overdraftDays / 31,
  );
  vec[ELIGIBILITY_FEATURE_INDEX.savingsRegularity] = clamp(
    metrics.savingsRegularityScore / 100,
  );
  vec[ELIGIBILITY_FEATURE_INDEX.expenseRatio] = clamp(
    metrics.expenseRatio / 100,
  );
  vec[ELIGIBILITY_FEATURE_INDEX.repaymentRegularity] = clamp(
    metrics.repaymentRegularityScore / 100,
  );
  vec[ELIGIBILITY_FEATURE_INDEX.revenueVolatility] = clamp(
    1 - metrics.revenueVolatilityScore / 100,
  );
  vec[ELIGIBILITY_FEATURE_INDEX.emergencyFund] = clamp(
    metrics.emergencyFundScore / 100,
  );
  vec[ELIGIBILITY_FEATURE_INDEX.balanceVolatility] = clamp(
    1 - metrics.balanceVolatilityScore / 100,
  );
  vec[ELIGIBILITY_FEATURE_INDEX.savingsRate] = clamp(metrics.savingsRate / 100);
  vec[ELIGIBILITY_FEATURE_INDEX.globalScore] = clamp(metrics.globalScore / 100);

  const deposit =
    typeof clientInputs.depot === 'number'
      ? clientInputs.depot
      : typeof clientInputs.dat_montant === 'number'
        ? clientInputs.dat_montant
        : typeof clientInputs.recharge_initiale === 'number'
          ? clientInputs.recharge_initiale
          : typeof clientInputs.depot_initial === 'number'
            ? clientInputs.depot_initial
            : 0;
  vec[ELIGIBILITY_FEATURE_INDEX.depositAmount] = clamp(deposit / 50_000_000);

  return vec;
}

export function computeRuleSatisfaction(
  metricValue: number,
  operator: string | null,
  threshold: number,
  metricMin?: number,
  metricMax?: number,
  field?: string,
): number {
  if (operator === 'BETWEEN') {
    const min = metricMin ?? 0;
    const max = metricMax ?? 1;
    if (metricValue <= min) return 0;
    if (metricValue >= max) return 1;
    return (metricValue - min) / (max - min);
  }

  if (operator === 'EQUALS') {
    const diff = Math.abs(metricValue - threshold);
    const tolerance = Math.max(Math.abs(threshold) * 0.1, 1);
    return Math.max(0, 1 - diff / tolerance);
  }

  if (operator === 'NOT_EQUALS') {
    const diff = Math.abs(metricValue - threshold);
    const tolerance = Math.max(Math.abs(threshold) * 0.1, 1);
    return Math.min(1, diff / tolerance);
  }

  const isLess = operator === 'LESS_THAN' || operator === 'LESS_OR_EQUAL';
  const isGreater =
    operator === 'GREATER_THAN' || operator === 'GREATER_OR_EQUAL';
  const margin = field ? getFieldMargin(field, threshold) : Math.max(Math.abs(threshold) * 0.15, 1);

  if (isLess) {
    if (metricValue <= threshold - margin) return 1;
    if (metricValue >= threshold) return 0;
    return 1 - (metricValue - (threshold - margin)) / margin;
  }

  if (isGreater) {
    if (metricValue >= threshold + margin) return 1;
    if (metricValue <= threshold) return 0;
    return (metricValue - threshold) / margin;
  }

  return 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export const FIELD_MARGINS: Record<string, number> = {
  monthlyIncome: 200000,
  debtRatio: 5,
  overdraftDays: 2,
  savingsRate: 3,
  expenseRatio: 5,
};

export function getFieldMargin(field: string, threshold: number): number {
  const specific = FIELD_MARGINS[field];
  if (specific !== undefined) return specific;
  return Math.max(Math.abs(threshold) * 0.15, 1);
}
