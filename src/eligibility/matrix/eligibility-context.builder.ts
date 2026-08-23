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
