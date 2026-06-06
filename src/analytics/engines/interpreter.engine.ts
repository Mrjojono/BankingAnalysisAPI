import { Injectable } from '@nestjs/common';
import type { AdviceIntent } from '../../messages/intents';

export type RuleContext = {
  category: string;
  label: string;
  amount: number;
  percent: number;
  prevAmount: number;
  change: number | null;
  totalRevenue: number;
  totalExpenses: number;
  expenseRatio: number;
};

type RuleDef = {
  condition: (ctx: RuleContext) => boolean;
  intent: (ctx: RuleContext) => AdviceIntent;
};

const BENCHMARKS = {
  LOGEMENT_MAX_PCT: 35,
  ALIMENTATION_MAX_PCT: 30,
  CREDIT_MAX_PCT: 33,
  TRANSPORT_MAX_PCT: 15,
  LOISIRS_MAX_PCT: 10,
  SPIKE_THRESHOLD: 30,
  CARBURANT_SPIKE: 20,
  SANTE_SPIKE: 50,
  DROP_THRESHOLD: -20,
  CRITICAL_EXPENSE_RATIO: 90,
  HIGH_EXPENSE_RATIO: 75,
};

function vars(
  ctx: RuleContext,
  extra?: Record<string, string | number>,
): Record<string, string | number> {
  return {
    amount: ctx.amount,
    percent: ctx.percent,
    change: ctx.change ?? 0,
    prev_amount: ctx.prevAmount,
    threshold: 0,
    label: ctx.label,
    ...extra,
  };
}

const RULES: RuleDef[] = [
  {
    condition: (ctx) => ctx.category === 'LOGEMENT' && ctx.percent > 50,
    intent: (ctx) => ({
      kind: 'LOGEMENT_CRITICAL',
      severity: 'WARNING',
      type: 'TOP_CATEGORY',
      category: 'LOGEMENT',
      vars: { ...vars(ctx), threshold: BENCHMARKS.LOGEMENT_MAX_PCT },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'LOGEMENT' &&
      ctx.percent >= BENCHMARKS.LOGEMENT_MAX_PCT &&
      ctx.percent <= 50,
    intent: (ctx) => ({
      kind: 'LOGEMENT_HIGH',
      severity: 'WARNING',
      type: 'TOP_CATEGORY',
      category: 'LOGEMENT',
      vars: { ...vars(ctx), threshold: BENCHMARKS.LOGEMENT_MAX_PCT },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'LOGEMENT' &&
      ctx.percent < BENCHMARKS.LOGEMENT_MAX_PCT &&
      ctx.percent > 0,
    intent: (ctx) => ({
      kind: 'LOGEMENT_OK',
      severity: 'INFO',
      type: 'TOP_CATEGORY',
      category: 'LOGEMENT',
      vars: { ...vars(ctx), threshold: BENCHMARKS.LOGEMENT_MAX_PCT },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'CREDIT' && ctx.percent > BENCHMARKS.CREDIT_MAX_PCT,
    intent: (ctx) => ({
      kind: 'CREDIT_HIGH',
      severity: 'WARNING',
      type: 'DEBT_WARNING',
      category: 'CREDIT',
      vars: { ...vars(ctx), threshold: BENCHMARKS.CREDIT_MAX_PCT },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'CREDIT' &&
      ctx.percent <= BENCHMARKS.CREDIT_MAX_PCT &&
      ctx.percent > BENCHMARKS.CREDIT_MAX_PCT - 5,
    intent: (ctx) => ({
      kind: 'CREDIT_NEAR_LIMIT',
      severity: 'INFO',
      type: 'DEBT_WARNING',
      category: 'CREDIT',
      vars: { ...vars(ctx), threshold: BENCHMARKS.CREDIT_MAX_PCT },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'CREDIT' && ctx.change !== null && ctx.change > 20,
    intent: (ctx) => ({
      kind: 'CREDIT_INCREASE',
      severity: 'WARNING',
      type: 'DEBT_WARNING',
      category: 'CREDIT',
      vars: { ...vars(ctx), threshold: BENCHMARKS.CREDIT_MAX_PCT },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'ALIMENTATION' &&
      ctx.change !== null &&
      ctx.change > BENCHMARKS.SPIKE_THRESHOLD,
    intent: (ctx) => ({
      kind: 'ALIMENTATION_SPIKE',
      severity: 'WARNING',
      type: 'SPENDING_SPIKE',
      category: 'ALIMENTATION',
      vars: { ...vars(ctx) },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'ALIMENTATION' &&
      ctx.percent > BENCHMARKS.ALIMENTATION_MAX_PCT,
    intent: (ctx) => ({
      kind: 'ALIMENTATION_HIGH',
      severity: 'INFO',
      type: 'TOP_CATEGORY',
      category: 'ALIMENTATION',
      vars: { ...vars(ctx), threshold: BENCHMARKS.ALIMENTATION_MAX_PCT },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'TRANSPORT' &&
      ctx.change !== null &&
      ctx.change > BENCHMARKS.SPIKE_THRESHOLD,
    intent: (ctx) => ({
      kind: 'TRANSPORT_SPIKE',
      severity: 'WARNING',
      type: 'SPENDING_SPIKE',
      category: 'TRANSPORT',
      vars: { ...vars(ctx) },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'TRANSPORT' &&
      ctx.percent > BENCHMARKS.TRANSPORT_MAX_PCT,
    intent: (ctx) => ({
      kind: 'TRANSPORT_HIGH',
      severity: 'WARNING',
      type: 'TOP_CATEGORY',
      category: 'TRANSPORT',
      vars: { ...vars(ctx), threshold: BENCHMARKS.TRANSPORT_MAX_PCT },
    }),
  },
  {
    condition: (ctx) =>
      (ctx.category === 'COMMERCE' || ctx.category === 'DIVERS') &&
      ctx.change !== null &&
      ctx.change > BENCHMARKS.SPIKE_THRESHOLD,
    intent: (ctx) => ({
      kind: 'COMMERCE_SPIKE',
      severity: 'WARNING',
      type: 'SPENDING_SPIKE',
      category: ctx.category,
      vars: { ...vars(ctx) },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'CARBURANT' &&
      ctx.change !== null &&
      ctx.change > BENCHMARKS.CARBURANT_SPIKE,
    intent: (ctx) => ({
      kind: 'CARBURANT_SPIKE',
      severity: 'WARNING',
      type: 'SPENDING_SPIKE',
      category: 'CARBURANT',
      vars: { ...vars(ctx) },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'SANTE' &&
      ctx.change !== null &&
      ctx.change > BENCHMARKS.SANTE_SPIKE,
    intent: (ctx) => ({
      kind: 'SANTE_HIGH',
      severity: 'INFO',
      type: 'SPENDING_SPIKE',
      category: 'SANTE',
      vars: { ...vars(ctx) },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'MOBILE_MONEY' && (ctx.change ?? 0) > 50,
    intent: (ctx) => ({
      kind: 'MOBILE_MONEY_HIGH',
      severity: 'INFO',
      type: 'SPENDING_SPIKE',
      category: 'MOBILE_MONEY',
      vars: { ...vars(ctx) },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'FRAIS_BANCAIRES' && ctx.amount > 10000,
    intent: (ctx) => ({
      kind: 'FEES_HIGH',
      severity: ctx.amount > 25000 ? 'CRITICAL' : 'WARNING',
      type: 'OVERDRAFT_RISK',
      category: 'FRAIS_BANCAIRES',
      vars: { ...vars(ctx) },
    }),
  },
  {
    condition: (ctx) =>
      ctx.category === 'SALAIRE' &&
      (ctx.change ?? 0) < BENCHMARKS.DROP_THRESHOLD,
    intent: (ctx) => ({
      kind: 'INCOME_DROP',
      severity: 'CRITICAL',
      type: 'INCOME_DROP',
      category: 'SALAIRE',
      vars: { ...vars(ctx), percent: Math.abs(ctx.change ?? 0) },
    }),
  },
  {
    condition: (ctx) =>
      ctx.expenseRatio < 50 && ctx.category === 'ALIMENTATION',
    intent: (ctx) => ({
      kind: 'GOOD_HABIT',
      severity: 'INFO',
      type: 'GOOD_HABIT',
      category: 'ALIMENTATION',
      vars: { ...vars(ctx) },
    }),
  },
];

@Injectable()
export class InterpreterEngine {
  interpret(ctx: RuleContext): AdviceIntent[] {
    const results: AdviceIntent[] = [];
    for (const rule of RULES) {
      if (rule.condition(ctx)) {
        results.push(rule.intent(ctx));
      }
    }
    return results;
  }
}
