import type { EligibilityMetrics } from './types';
import type { MatrixProduct } from './types';
import { computeRuleSatisfaction } from './eligibility-context.builder';
import { ANALYTICS_FIELD_MAP, ELIGIBLE_THRESHOLD, PARTIAL_THRESHOLD } from '../types';
import type { RuleResult } from '../types';

const ADVICE_TEMPLATES: Record<string, { fail: string; partial: string }> = {
  monthlyIncome: {
    fail: 'Vos revenus sont insuffisants pour ce produit. Augmentez vos revenus ou consolidez vos sources de revenus.',
    partial: 'Vos revenus sont proches du minimum requis. Continuez à les améliorer.',
  },
  debtRatio: {
    fail: 'Votre taux d\'endettement est trop élevé. Remboursez vos dettes existantes avant de solliciter un nouveau crédit.',
    partial: 'Votre taux d\'endettement est limite. Évitez de contracter de nouveaux crédits.',
  },
  expenseRatio: {
    fail: 'Vos dépenses mensuelles sont trop élevées par rapport à vos revenus. Réduisez vos dépenses pour améliorer ce ratio.',
    partial: 'Votre ratio dépenses/revenus est élevé. Essayez de réduire certaines dépenses non essentielles.',
  },
  repaymentRegularity: {
    fail: 'Vous avez des retards de remboursement. Respectez vos échéances pour améliorer votre score.',
    partial: 'Quelques retards de paiement détectés. Essayez de les éviter à l\'avenir.',
  },
  savingsRate: {
    fail: 'Votre taux d\'épargne est insuffisant. Essayez d\'épargner au moins 10% de vos revenus chaque mois.',
    partial: 'Continuez à améliorer votre taux d\'épargne pour atteindre l\'objectif recommandé.',
  },
  overdraftDays: {
    fail: 'Vous passez trop de jours en découvert. Évitez les découverts bancaires et régularisez votre solde rapidement.',
    partial: 'Réduisez le nombre de jours de découvert pour améliorer votre profil.',
  },
  savingsRegularity: {
    fail: 'Votre épargne est irrégulière. Mettez en place un virement automatique mensuel.',
    partial: 'Essayez d\'épargner de façon plus régulière chaque mois.',
  },
  emergencyFundScore: {
    fail: 'Vous n\'avez pas de fonds d\'urgence suffisant. Constituez une épargne de précaution.',
    partial: 'Continuez à alimenter votre fonds d\'urgence pour atteindre le niveau recommandé.',
  },
  balanceVolatility: {
    fail: 'Votre solde est trop volatile. Stabilisez vos entrées et sorties d\'argent.',
    partial: 'Votre solde est légèrement instable. Essayez de lisser vos dépenses.',
  },
  revenueVolatility: {
    fail: 'Vos revenus sont trop irréguliers. Diversifiez vos sources de revenus.',
    partial: 'Vos revenus sont modérément irréguliers. Un apport complémentaire pourrait aider.',
  },
};

function generateAdvice(field: string, status: 'PASS' | 'FAIL' | 'PARTIAL'): string | null {
  if (status === 'PASS') return null;
  const templates = ADVICE_TEMPLATES[field];
  if (!templates) return null;
  return templates[status];
}

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
      rule.field,
    );

    const earned = satisfaction * weight;
    earnedWeight += earned;

    const status =
      satisfaction >= 1 ? 'PASS' : satisfaction <= 0 ? 'FAIL' : 'PARTIAL';

    const advice = generateAdvice(rule.field, status);
    const message = status === 'PASS'
      ? `${rule.label} : respecté`
      : status === 'PARTIAL'
        ? `${rule.label} : partiellement respecté`
        : `${rule.label} : non respecté`;

    ruleResults.push({
      ruleId: rule.id,
      ruleCode: rule.code,
      label: rule.label,
      field: rule.field,
      status,
      valueSource: 'analytics',
      clientValue: metricValue,
      threshold: rule.value ?? null,
      thresholdMin: rule.valueMin ?? null,
      thresholdMax: rule.valueMax ?? null,
      scoreEarned: Math.round(earned),
      scoreMax: weight,
      message,
      advice,
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
