import { Injectable } from '@nestjs/common';
import type { Rule } from '../../../generated/prisma/client';
import type { RuleResult } from '../types';
import { realizeEligibilityIntent } from '../../messages/realizer';
import { getFieldMargin } from '../matrix/eligibility-context.builder';
import type {
  EligibilityPatternKind,
  EligibilityStatus,
} from '../../messages/intents';

const OPS = {
  GREATER_THAN: 'GREATER_THAN',
  LESS_THAN: 'LESS_THAN',
  EQUALS: 'EQUALS',
  GREATER_OR_EQUAL: 'GREATER_OR_EQUAL',
  LESS_OR_EQUAL: 'LESS_OR_EQUAL',
  BETWEEN: 'BETWEEN',
  NOT_EQUALS: 'NOT_EQUALS',
} as const;

const FIELD_PATTERNS: [RegExp, string][] = [
  [/(endettement|debt|ratio)/i, 'RATE_MAX'],
  [/(epargn|saving|regularit)/i, 'RATE_MIN'],
  [/(decouvert|overdraft)/i, 'AMOUNT_MAX'],
  [/(revenu|income|salaire|apport|depot minimum|montant mini)/i, 'AMOUNT_MIN'],
];

function inferPatternType(
  field: string,
  label: string,
  operator: string | null,
  hasPercentage: boolean,
): EligibilityPatternKind {
  const text = `${field} ${label}`.toLowerCase();
  if (hasPercentage) {
    if (operator === 'LESS_THAN' || operator === 'LESS_OR_EQUAL')
      return 'RATE_MAX';
    if (operator === 'GREATER_THAN' || operator === 'GREATER_OR_EQUAL')
      return 'RATE_MIN';
  }
  if (operator === 'BETWEEN') return 'RANGE';
  for (const [regex, type] of FIELD_PATTERNS) {
    if (regex.test(text)) return type as EligibilityPatternKind;
  }
  const isLess = operator === 'LESS_THAN' || operator === 'LESS_OR_EQUAL';
  const isGreater =
    operator === 'GREATER_THAN' || operator === 'GREATER_OR_EQUAL';
  if (operator === 'EQUALS') return 'EQUALS';
  if (isGreater) return 'GENERIC_MIN';
  if (isLess) return 'GENERIC_MAX';
  return 'UNKNOWN';
}

function detectUnit(field: string, label: string): string {
  const text = `${field} ${label}`.toLowerCase();
  if (/(taux|ratio|volatilite|regularite|epargne|score|%|pourcent)/i.test(text))
    return '%';
  if (
    /(montant|frais|revenu|salaire|apport|depot|decouvert|plafond|solde)/i.test(
      text,
    )
  )
    return ' FCFA';
  return '';
}

const READABLE_LABELS: Record<string, string> = {
  debtRatio: "taux d'endettement",
  monthlyIncome: 'revenus mensuels',
  savingsRate: "taux d'épargne",
  overdraftDays: 'jours de découvert',
  expenseRatio: 'ratio dépenses/revenus',
  repaymentRegularity: 'régularité de remboursement',
  revenueVolatility: 'volatilité des revenus',
  savingsRegularity: "régularité d'épargne",
  emergencyFundScore: "fonds d'urgence",
  balanceVolatility: 'volatilité du solde',
};

function getReadableLabel(field: string, fallback: string): string {
  return READABLE_LABELS[field] ?? fallback;
}

@Injectable()
export class RuleEvaluator {
  evaluate(
    rule: Rule,
    clientValue: number | boolean | string | null,
    valueSource: RuleResult['valueSource'] = 'input',
  ): RuleResult {
    const passed = this.applyOperator(rule, clientValue);
    const partial = !passed && this.isPartial(rule, clientValue);
    const status: EligibilityStatus = passed
      ? 'PASS'
      : partial
        ? 'PARTIAL'
        : 'FAIL';
    const scoreEarned = passed
      ? rule.weight
      : partial
        ? Math.round(rule.weight * 0.4)
        : 0;

    const ptype = inferPatternType(
      rule.field ?? '',
      rule.label,
      rule.operator,
      rule.percentage != null,
    );
    const unit = detectUnit(rule.field ?? '', rule.label);
    const label = getReadableLabel(rule.field ?? '', '');

    const valeurStr =
      typeof clientValue === 'boolean'
        ? clientValue
          ? 'Oui'
          : 'Non'
        : typeof clientValue === 'string'
          ? clientValue
          : Number(clientValue).toLocaleString('fr-FR');

    const seuilStr =
      rule.value?.toLocaleString('fr-FR') ?? rule.percentage?.toString() ?? '';

    const intent = {
      kind: ptype,
      status,
      label,
      value: valeurStr,
      threshold: seuilStr,
      unit,
      gap: '',
      min: rule.valueMin?.toLocaleString('fr-FR') ?? '',
      max: rule.valueMax?.toLocaleString('fr-FR') ?? '',
      sourceNote:
        valueSource === 'analytics' ? ' (calculé depuis vos opérations)' : '',
    };

    const gapValue = (() => {
      if (status !== 'FAIL' || typeof clientValue !== 'number')
        return undefined;
      const threshold = rule.value;
      if (threshold == null) return undefined;
      const isLess =
        rule.operator === 'LESS_THAN' || rule.operator === 'LESS_OR_EQUAL';
      const gap = isLess
        ? Math.round(clientValue - threshold)
        : Math.round(threshold - clientValue);
      return gap > 0 ? gap.toLocaleString('fr-FR') : undefined;
    })();

    if (gapValue) {
      intent.gap = gapValue;
    }

    const { message, advice } = realizeEligibilityIntent(intent, rule.id);

    return {
      ruleId: rule.id,
      ruleCode: rule.code,
      label: rule.label,
      field: rule.field ?? '',
      status,
      valueSource,
      clientValue,
      threshold: rule.value ?? rule.percentage ?? null,
      thresholdMin: rule.valueMin ?? null,
      thresholdMax: rule.valueMax ?? null,
      scoreEarned,
      scoreMax: rule.weight,
      message,
      advice,
    };
  }

  private applyOperator(
    rule: Rule,
    clientValue: number | boolean | string | null,
  ): boolean {
    if (clientValue === null || clientValue === undefined) return false;
    const op = rule.operator as string | null;
    if (!op) return false;
    const v = Number(clientValue);
    const t = rule.value ?? 0;

    switch (op) {
      case OPS.GREATER_THAN:
        return v > t;
      case OPS.LESS_THAN:
        return v < t;
      case OPS.GREATER_OR_EQUAL:
        return v >= t;
      case OPS.LESS_OR_EQUAL:
        return v <= t;
      case OPS.EQUALS:
        if (typeof clientValue === 'boolean') return clientValue === Boolean(t);
        if (typeof clientValue === 'string') return clientValue === String(t);
        return v === t;
      case OPS.NOT_EQUALS:
        return v !== t;
      case OPS.BETWEEN:
        return v >= (rule.valueMin ?? 0) && v <= (rule.valueMax ?? 0);
      default:
        return false;
    }
  }

  private isPartial(
    rule: Rule,
    clientValue: number | boolean | string | null,
  ): boolean {
    if (clientValue === null || clientValue === undefined) return false;
    if (typeof clientValue === 'boolean' || typeof clientValue === 'string')
      return false;
    if (!rule.value) return false;
    const v = Number(clientValue);
    const t = rule.value;
    const gap = Math.abs(v - t);
    const margin = getFieldMargin(rule.field ?? '', t);
    return gap <= margin;
  }
}
