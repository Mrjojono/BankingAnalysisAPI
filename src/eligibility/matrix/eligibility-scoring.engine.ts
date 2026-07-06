import type { EligibilityMetrics } from './types';
import type { MatrixProduct } from './types';
import { computeRuleSatisfaction } from './eligibility-context.builder';
import { ANALYTICS_FIELD_MAP, ELIGIBLE_THRESHOLD, PARTIAL_THRESHOLD } from '../types';
import type { RuleResult } from '../types';

export type ProductScore = {
  productCode: string;
  rawScore: number;
  normalizedScore: number;
  totalWeight: number;
  earnedWeight: number;
  ruleResults: RuleResult[];
};

export function scoreProduct(
  product: MatrixProduct,
  metrics: EligibilityMetrics,
  clientInputs: Record<string, number | boolean | string>,
): ProductScore {
  let earnedWeight = 0;
  let totalWeight = 0;
  const ruleResults: RuleResult[] = [];

  for (const rule of product.rules) {
    const weight = rule.weight ?? 0;
    totalWeight += weight;

    const metricValue = resolveMetricValue(rule.field, metrics, clientInputs);
    const satisfaction = computeRuleSatisfaction(
      metricValue,
      rule.operator,
      rule.value ?? 0,
      rule.valueMin ?? undefined,
      rule.valueMax ?? undefined,
    );

    const earned = satisfaction * weight;
    earnedWeight += earned;

    const status =
      satisfaction >= 1 ? 'PASS' : satisfaction <= 0 ? 'FAIL' : 'PARTIAL';

    ruleResults.push({
      ruleId: rule.id,
      ruleCode: rule.code,
      label: rule.label,
      status,
      valueSource: 'analytics',
      clientValue: metricValue,
      threshold: rule.value ?? null,
      thresholdMin: rule.valueMin ?? null,
      thresholdMax: rule.valueMax ?? null,
      scoreEarned: Math.round(earned),
      scoreMax: weight,
      message: '',
      advice: null,
    });
  }

  const rawScore = totalWeight > 0 ? earnedWeight / totalWeight : 0;
  const normalizedScore =
    totalWeight > 0 ? Math.max(0, Math.min(1, rawScore)) : 0;

  return {
    productCode: product.code,
    rawScore,
    normalizedScore,
    totalWeight,
    earnedWeight,
    ruleResults,
  };
}

function resolveMetricValue(
  field: string,
  metrics: EligibilityMetrics,
  clientInputs: Record<string, number | boolean | string>,
): number {
  if (field in clientInputs) {
    const v = clientInputs[field];
    return typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : 0;
  }

  const metricKey = ANALYTICS_FIELD_MAP[field];
  if (metricKey && metricKey in metrics) {
    return (metrics as any)[metricKey] ?? 0;
  }

  return 0;
}

export function normalizedScoreToStatus(
  score: number,
): 'ELIGIBLE' | 'PARTIAL' | 'NOT_ELIGIBLE' {
  if (score >= ELIGIBLE_THRESHOLD) return 'ELIGIBLE';
  if (score >= PARTIAL_THRESHOLD) return 'PARTIAL';
  return 'NOT_ELIGIBLE';
}
