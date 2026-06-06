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
export const ANALYTICS_FIELD_MAP: Record<string, string> = {
  monthlyIncome: 'monthlyIncome', // Revenu mensuel moyen
  debtRatio: 'debtRatio', // Taux d'endettement (%)
  expenseRatio: 'expenseRatio', // Ratio dépenses/revenus
  repaymentRegularity: 'repaymentRegularityScore', // Régularité des remboursements
  savingsRate: 'savingsRate', // Taux d'épargne (%)
  overdraftDays: 'overdraftDays', // Jours de découvert
  revenueVolatility: 'revenueVolatilityScore', // Volatilité des revenus
  savingsRegularity: 'savingsRegularityScore', // Régularité épargne
  emergencyFundScore: 'emergencyFundScore', // Fonds d'urgence
  balanceVolatility: 'balanceVolatilityScore', // Volatilité du solde
};
