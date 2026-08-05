/**
 * Contient :
 *   - EligibilityResult : ce que le moteur retourne (score global + détails)
 *   - RuleResult        : résultat de l'évaluation d'une seule règle
 *   - ANALYTICS_FIELD_MAP : mapping entre les noms de champs des règles
 *     et les métriques calculées automatiquement par le module Analytics
 *     via OverviewService.gatherMetrics()
 */

export type EligibilityResult = {
  productCode: string;
  productName: string;
  productDescription: string;
  hasEligibilityRules: boolean;
  globalScore: number;
  maxScore: number;
  scorePercent: number;
  status: 'ELIGIBLE' | 'PARTIAL' | 'NOT_ELIGIBLE';
  reason?: string;
  ruleResults: RuleResult[];
  infoRules: RuleResult[]; // ← NOUVEAU : règles non-ELIGIBILITY (frais, limites, taux)
  passedRules: RuleResult[];
  failedRules: RuleResult[];
  partialRules: RuleResult[];
};

// ─── Résultat de l'évaluation d'une seule règle ───────────────────────
export type RuleResult = {
  ruleId: string;
  ruleCode: string;
  label: string;
  field: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  valueSource: 'analytics' | 'input' | 'not_found';
  clientValue: number | boolean | string | null;
  threshold: number | null;
  thresholdMin: number | null;
  thresholdMax: number | null;
  scoreEarned: number;
  scoreMax: number;
  message: string;
  advice: string | null;
};

// ─── Mapping champs règles → métriques analytics ──────────────────────
//
// Quand une règle a un champ comme "debtRatio", le moteur cherche
// automatiquement la valeur correspondante dans le profil financier
// calculé par OverviewService.gatherMetrics().
//
// Pour ajouter une nouvelle métrique :
//   1. Calculer la valeur dans gatherMetrics()
//   2. Ajouter l'entrée ici
//   3. Créer une règle en base avec field = nom de la clé
//
export const ELIGIBLE_THRESHOLD = 0.7;
export const PARTIAL_THRESHOLD = 0.4;

export const ANALYTICS_FIELD_MAP: Record<string, string> = {
  monthlyIncome: 'monthlyIncome',
  debtRatio: 'debtRatio',
  expenseRatio: 'expenseRatio',
  repaymentRegularity: 'repaymentRegularityScore',
  savingsRate: 'savingsRate',
  overdraftDays: 'overdraftDays',
  revenueVolatility: 'revenueVolatilityScore',
  savingsRegularity: 'savingsRegularityScore',
  emergencyFundScore: 'emergencyFundScore',
  balanceVolatility: 'balanceVolatilityScore',
};

export type ImprovementPlanItem = {
  ruleId: string;
  ruleCode: string;
  label: string;
  field: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  clientValue: number | boolean | string | null;
  threshold: number | null;
  advice: string | null;
  potentialScore: number;
  improvementGap: number;
};

export type ImprovementPlan = {
  customerId: string;
  currentGlobalScore: number;
  maxScore: number;
  potentialScore: number;
  improvementRate: number;
  items: ImprovementPlanItem[];
};

export type SimulationAdjustment = {
  field: string;
  from: number;
  to: number;
  delta: number;
};

export type SimulationResult = {
  current: EligibilityResult;
  simulated: EligibilityResult;
  adjustments: SimulationAdjustment[];
};

export type ProductScoreSummary = {
  productCode: string;
  productName: string;
  scorePercent: number;
  status: 'ELIGIBLE' | 'PARTIAL' | 'NOT_ELIGIBLE';
};

export type EligibilityDashboard = {
  customerId: string;
  overview: {
    bestScore: ProductScoreSummary | null;
    worstScore: ProductScoreSummary | null;
    averageScore: number;
    totalProducts: number;
  };
  productScores: ProductScoreSummary[];
  criticalRules: RuleResult[];
};

export function buildInfoRules(rules: any[]): RuleResult[] {
  return rules.map((rule) => {
    const seuil = rule.value?.toLocaleString('fr-FR') ?? '';
    const pct = rule.percentage != null ? `${rule.percentage}%` : '';
    const montant = rule.flatAmount?.toLocaleString('fr-FR') ?? '';
    const periode = rule.period ?? '';

    let detail = '';
    if (rule.flatAmount != null) {
      detail = `${montant} FCFA${periode ? `/${periode}` : ''}`;
    } else if (rule.percentage != null) {
      detail = `${pct}${rule.minAmount ? ` (min ${rule.minAmount.toLocaleString('fr-FR')} FCFA)` : ''}`;
    } else if (rule.value != null) {
      const op = rule.operator === 'GREATER_OR_EQUAL' ? 'max' : 'min';
      detail = `${op === 'max' ? '\u2264' : '\u2265'} ${seuil} FCFA`;
    }

    return {
      ruleId: rule.id,
      ruleCode: rule.code,
      label: rule.label,
      field: rule.field ?? '',
      status: 'PASS' as const,
      valueSource: 'input' as const,
      clientValue: null,
      threshold: rule.value ?? rule.percentage ?? null,
      thresholdMin: null,
      thresholdMax: null,
      scoreEarned: 0,
      scoreMax: 0,
      message: `${rule.label} : ${detail}`.replace(/ : $/, ''),
      advice: null,
    };
  });
}
