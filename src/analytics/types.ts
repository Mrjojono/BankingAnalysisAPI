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

export type Transaction = {
  id: string;
  amount: bigint;
  senderCustomerId?: string;
  receiverCustomerId?: string;
  createdAt: Date;
  transactionDate: Date;
  description?: string;
  status?: TransactionStatus;
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
