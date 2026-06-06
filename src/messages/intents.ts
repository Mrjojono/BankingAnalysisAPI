import catalog from './catalog.json';

export type Catalog = typeof catalog;
export type InterpreterCatalog = Catalog['interpreter'];
export type AdviceTemplateCatalog = Catalog['advice_templates'];
export type EligibilityCatalog = Catalog['eligibility'];

export type IntentKind = keyof InterpreterCatalog;
export type AdviceTemplateKind = keyof AdviceTemplateCatalog;
export type EligibilityPatternKind = keyof EligibilityCatalog;

export type EligibilityStatus = 'PASS' | 'FAIL' | 'PARTIAL';
export type AdviceSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AdviceInsightType =
  | 'SPENDING_SPIKE'
  | 'TOP_CATEGORY'
  | 'SAVINGS_DROP'
  | 'OVERDRAFT_RISK'
  | 'HIGH_EXPENSE_RATIO'
  | 'SUBSCRIPTION_BLOAT'
  | 'DEBT_WARNING'
  | 'INCOME_DROP'
  | 'BALANCE_LOW'
  | 'GOOD_HABIT';

export type AdviceIntent = {
  kind: IntentKind;
  severity: AdviceSeverity;
  category?: string;
  vars: Record<string, string | number>;
  type?: AdviceInsightType;
  action?: string;
  metric?: {
    current: number;
    previous?: number;
    change?: number;
    threshold?: number;
  };
};

export type EligibilityIntent = {
  kind: EligibilityPatternKind;
  status: EligibilityStatus;
  label: string;
  value: string;
  threshold: string;
  unit: string;
  gap?: string;
  min?: string;
  max?: string;
  sourceNote?: string;
};

export type PersonalAdvice = {
  type: AdviceInsightType;
  severity: AdviceSeverity;
  title: string;
  message: string;
  action?: string;
  category?: string;
  metric: {
    current: number;
    previous?: number;
    change?: number;
    threshold?: number;
  };
};
