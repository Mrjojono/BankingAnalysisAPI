export type Period = {
  from: Date;
  to: Date;
};

export enum TransactionStatus {
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  REVERSED = 'REVERSED',
  POSTED = 'POSTED',
  FAILED = 'FAILED',
}

export type BankAccount = {
  id: string;
  customerId: string;
  accountId: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'LOAN' | 'CORPORATE' | 'MOBILE_MONEY';
  currency: string;
};

export type Account = {
  id: string;
  code: string;
  name: string;
  glAccountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balanceType: 'DEBIT' | 'CREDIT';
  settledBalance: bigint;
  bankAccount?: BankAccount;
};

export type Entry = {
  id: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: bigint;
  transactionId: string;
  accountId: string;
  transaction: Transaction;
  account: Account & { bankAccount?: BankAccount };
};

export type Transaction = {
  id: string;
  amount: bigint;
  senderCustomerId?: string;
  receiverCustomerId?: string;
  createdAt: Date;
  transactionDate: Date;
  description?: string;
  status?: TransactionStatus;
  journalId?: string;
  ledgerId?: string;
};

export type RevenueAnalytics = {
  currentMonth: {
    total: number;
    month: string;
  };
  previousMonth: {
    total: number;
    month: string;
  };
  averageLast6Months: number;
  variationPercent: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  rolling30Days: number;
};

export type CashFlowAnalytics = {
  period: {
    from: string;
    to: string;
  };
  totalCredits: {
    count: number;
    amount: number;
  };
  totalDebits: {
    count: number;
    amount: number;
  };
  netFlow: number;
};

export type MonthlySummary = {
  currentMonth: {
    total: number;
    month: string;
  };
  previousMonth: {
    total: number;
    month: string;
  };
  averageLast6Months: number;
  variationPercent: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  rolling30Days: number;
};

/**
 * Representes la frequences des revenus
 * sur une periode donnee.
 * @param entriesPerMonth - Nombre d'entries par mois.
 * @param entriesPerWeek - Nombre d'entries par semaine.
 * @param averageIntervalDays - Interval moyen en jours entre les entries.
 * @param stabilityStdDev - Ecart-type de la stabilite.
 * @param coefficientOfVariation - Coefficient de variation.
 * @param stabilityLabel - Label de stabilite.
 * @param stabilityScore - Score de stabilite.
 * @example
 * ```ts
 * const frequency: IncomeFrequency = {
 *   entriesPerMonth: 10,
 *   entriesPerWeek: 5,
 *   averageIntervalDays: 7,
 *   stabilityStdDev: 2,
 *   coefficientOfVariation: 0.3,
 *   stabilityLabel: 'stable',
 *   stabilityScore: 85,
 * };
 * ```
 */
export type IncomeFrequency = {
  entriesPerMonth: number;
  entriesPerWeek: number;
  averageIntervalDays: number;
  stabilityStdDev: number;
  coefficientOfVariation: number;
  stabilityLabel: string;
  stabilityScore: number;
};

export type RevenueSource = {
  category: string;
  amount: number;
  percent?: number;
  count?: number;
};
export type RevenueSources = {
  source: RevenueSource[];
  totalAmount: number;
  dominantSource: string;
};

export interface MonthlyRevenue {
  month: string;
  amount: number;
  variationPercent: number | null;
}

export interface RevenueVariation {
  monthlyRevenues: MonthlyRevenue[];
  averageVariationPercent: number;
  stdDev: number;
  coefficientOfVariation: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  volatilityScore: number;
}

export type Expense = {
  totalExpenses: number;
  count: number;
  averageTransactionAmount: number;
  largestExpense: {
    amount: number;
    description: string;
    date: string;
  };
};

export type Category = {
  category: string;
  amount: number;
  percent: number;
  count: number;
};

export type CategoryExpense = {
  categories: Category[];
  totalExpenses: number;
};

export type RecurringExpense = {
  recurringExpenses: {
    description: string;
    averageAmount: number;
    frequency: 'MONTHLY';
    occurrences: number;
    nextExpectedDate: string;
    category: string;
  }[];
  totalRecurringAmount: number;
  totalRecurringCount: number;
};

export type VariableTransaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
};

export type VariableExpenseAnalytics = {
  totalExpenses: number;
  recurringExpenses: number;
  variableExpenses: number;
  variablePercent: number;
  variableTransactions: VariableTransaction[];
};

export type ExpenseRatioAnalytics = {
  totalRevenues: number;
  totalExpenses: number;
  ratio: number;
  ratioLabel: string;
  score: number;
  interpretation: string;
};

export type DailyBalance = {
  date: string;
  balance: number;
};

export type AverageBalanceResponse = {
  month: string;
  averageBalance: number;
  dailyBalances: DailyBalance[];
};

export type BalanceExtremesResponse = {
  minimum: { amount: number; date: string };
  maximum: { amount: number; date: string };
  range: number;
};

export type OverdraftAnalyticsResponse = {
  overdraftDays: number;
  totalDays: number;
  overdraftRate: number;
  overdraftLabel: string;
  score: number;
  overdraftDates: string[];
};

export type NegativePeriod = {
  from: string;
  to: string;
  durationDays: number;
  minBalance: number;
};

export type NegativePeriodsResponse = {
  negativePeriods: NegativePeriod[];
  totalNegativeDays: number;
  averageDuration: number;
  maxDuration: number;
  longestPeriod: { from: string; to: string } | null;
};

export type BalanceVolatilityResponse = {
  averageBalance: number;
  stdDev: number;
  coefficientOfVariation: number;
  volatilityLabel: string;
  score: number;
};

type Credit = {
  description: string;
  monthlyAmount: number;
  firstDetected: string;
  occurences: number;
  confidence: string;
};

export type Debt = {
  detectedCredits: Credit[];
  totalMonthlyDebt: number;
};

export type TotalDebtAnalytics = {
  debts: {
    description: string;
    monthlyAmount: number;
    estimatedRemainingMonths: number;
    estimatedRemainingDebt: number;
  }[];
  totalEstimatedDebt: number;
  totalMonthlyCommitments: number;
};

export type MonthlyPaymentsAnalytics = {
  totalMonthlyPayments: number;
  breakdown: {
    description: string;
    amount: number;
    percent: number;
  }[];
};

export type DebtRatioAnalytics = {
  monthlyIncome: number;
  monthlyDebtPayments: number;
  debtRatio: number;
  bceaoThreshold: number;
  label: string;
  score: number;
  margin: number;
  interpretation: string;
};

export type RepaymentHistoryItem = {
  month: string;
  paid: boolean;
  daysFromExpected: number;
};

export type RepaymentHistoryAnalytics = {
  monthsAnalyzed: number;
  paymentsOnTime: number;
  regularityRate: number;
  score: number;
  history: RepaymentHistoryItem[];
};

export type SavingsRateAnalytics = {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyDebtPayments: number;
  netSavings: number;
  savingsRate: number;
  label: string;
  score: number;
  garmanForgueThreshold: number;
};

export type SavingsFrequencyAnalytics = {
  monthsWithSavings: number;
  totalMonths: number;
  regularityRate: number;
  score: number;
  averageDepositAmount: number;
  depositsByMonth: {
    month: string;
    saved: boolean;
    amount: number;
  }[];
};

export type SavingsGoal = {
  id?: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  progressPercent: number;
  targetDate: string;
  monthsRemaining: number;
  requiredMonthlySaving: number;
  status: 'ON_TRACK' | 'BEHIND';
};

export type SavingsRetentionAnalytics = {
  averageRetentionDays: number;
  label: string;
  score: number;
  retentionByMonth: {
    month: string;
    retentionDays: number;
  }[];
  interpretation: string;
};

export type ScoreComponent = {
  score: number;
  weight: number;
  contribution: number;
};

export type ComponentInterpretation = {
  level: 'CRITIQUE' | 'FAIBLE' | 'MOYEN' | 'BON' | 'EXCELLENT';
  label: string;
  message: string;
  priorities: string[];
};

export type GlobalScoreResponse = {
  globalScore: number;
  label: string;
  components: {
    C1_expenses: ScoreComponent;
    C2_debt: ScoreComponent;
    C3_savings: ScoreComponent;
    C4_stability: ScoreComponent;
  };
  interpretations: {
    C1_expenses: ComponentInterpretation;
    C2_debt: ComponentInterpretation;
    C3_savings: ComponentInterpretation;
    C4_stability: ComponentInterpretation;
  };
  methodology: string;
};

export type ScoreIndicator = {
  name: string;
  value: string;
  score: number;
  impact: 'POSITIF' | 'NEGATIF' | 'NEUTRE';
};

export type ScoreExplanationResponse = {
  globalScore: number;
  strengths: string[];
  weaknesses: string[];
  indicators: ScoreIndicator[];
};

export type ScoreHistoryItem = {
  month: string;
  score: number;
  label: string;
};

export type ScoreHistoryResponse = {
  history: ScoreHistoryItem[];
  trend: 'UP' | 'DOWN' | 'STABLE';
  improvement: string;
};

export type Recommendation = {
  id?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  component: string;
  trigger: string;
  title: string;
  message: string;
  actionAmount?: number;
  source: string;
};

export type RecommendationResponse = {
  recommendations: Recommendation[];
};

export type ScoreMetrics = {
  expenseRatioScore: number;
  paymentRegularityScore: number;
  debtRatioScore: number;
  repaymentRegularityScore: number;
  creditUtilizationScore: number;
  savingsRateScore: number;
  emergencyFundScore: number;
  savingsRegularityScore: number;
  overdraftScore: number;
  revenueVolatilityScore: number;
  balanceVolatilityScore: number;
  debtRatio: number;
  monthsData: number;
};

export type RecommendationMetrics = {
  debtRatio: number;
  savingsRate: number;
  overdraftDays: number;
  expenseRatio: number;
  revenueVolatility: number;
  repaymentRegularity: number;
  monthlyIncome: number;
  monthlyExpenses: number;
};
