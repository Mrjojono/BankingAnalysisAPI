import { ApiProperty } from '@nestjs/swagger';

export class MonthTotalDto {
  @ApiProperty({ example: 1500000 })
  total: number;

  @ApiProperty({ example: '2024-05' })
  month: string;
}

export class RevenueAnalyticsDto {
  @ApiProperty()
  currentMonth: MonthTotalDto;

  @ApiProperty()
  previousMonth: MonthTotalDto;

  @ApiProperty({ example: 1450000 })
  averageLast6Months: number;

  @ApiProperty({ example: 3.45 })
  variationPercent: number;

  @ApiProperty({ enum: ['UP', 'DOWN', 'STABLE'] })
  trend: 'UP' | 'DOWN' | 'STABLE';

  @ApiProperty({ example: 1200000 })
  rolling30Days: number;
}

export class CashFlowAnalyticsDto {
  @ApiProperty()
  period: { from: string; to: string };

  @ApiProperty()
  totalCredits: { count: number; amount: number };

  @ApiProperty()
  totalDebits: { count: number; amount: number };

  @ApiProperty()
  netFlow: number;
}

export class IncomeFrequencyDto {
  @ApiProperty({ example: 4 })
  entriesPerMonth: number;

  @ApiProperty({ example: 1 })
  entriesPerWeek: number;

  @ApiProperty({ example: 7.5 })
  averageIntervalDays: number;

  @ApiProperty({ example: 1.2 })
  stabilityStdDev: number;

  @ApiProperty({ example: 15.5 })
  coefficientOfVariation: number;

  @ApiProperty({ example: 'STABLE' })
  stabilityLabel: string;

  @ApiProperty({ example: 70 })
  stabilityScore: number;
}

export class RevenueSourceDto {
  @ApiProperty({ example: 'SALARY' })
  category: string;

  @ApiProperty({ example: 1200000 })
  amount: number;

  @ApiProperty({ example: 80 })
  percent: number;

  @ApiProperty({ example: 1 })
  count: number;
}

export class RevenueSourcesResponseDto {
  @ApiProperty({ type: [RevenueSourceDto] })
  source: RevenueSourceDto[];

  @ApiProperty({ example: 1500000 })
  totalAmount: number;

  @ApiProperty({ example: 'SALARY' })
  dominantSource: string;
}

export class MonthlyRevenueDto {
  @ApiProperty({ example: '2024-05' })
  month: string;

  @ApiProperty({ example: 1500000 })
  amount: number;

  @ApiProperty({ example: 5.2, nullable: true })
  variationPercent: number | null;
}

export class RevenueVariationResponseDto {
  @ApiProperty({ type: [MonthlyRevenueDto] })
  monthlyRevenues: MonthlyRevenueDto[];

  @ApiProperty({ example: 2.1 })
  averageVariationPercent: number;

  @ApiProperty({ example: 50000 })
  stdDev: number;

  @ApiProperty({ example: 12.5 })
  coefficientOfVariation: number;

  @ApiProperty({ enum: ['UP', 'DOWN', 'STABLE'] })
  trend: 'UP' | 'DOWN' | 'STABLE';

  @ApiProperty({ example: 85 })
  volatilityScore: number;
}

export class FullOverviewResponseDto {
  @ApiProperty()
  cashFlow: CashFlowAnalyticsDto;

  @ApiProperty()
  revenueAnalytics: RevenueAnalyticsDto;

  @ApiProperty()
  monthlySummary: RevenueAnalyticsDto;

  @ApiProperty()
  incomeFrequency: IncomeFrequencyDto;

  @ApiProperty()
  revenueSources: RevenueSourcesResponseDto;

  @ApiProperty()
  revenueVariation: RevenueVariationResponseDto;
}

class LargestExpenseDto {
  @ApiProperty({ example: 80000 })
  amount: number;

  @ApiProperty({ example: 'LOYER' })
  description: string;

  @ApiProperty({ example: '2024-01-01' })
  date: string;
}

export class ExpenseDto {
  @ApiProperty({ example: 210000 })
  totalExpenses: number;

  @ApiProperty({ example: 18 })
  count: number;

  @ApiProperty({ example: 11666 })
  averageTransactionAmount: number;

  @ApiProperty()
  largestExpense: LargestExpenseDto;
}

export class CategoryDto {
  @ApiProperty({ example: 'LOGEMENT' })
  category: string;

  @ApiProperty({ example: 80000 })
  amount: number;

  @ApiProperty({ example: 38.1 })
  percent: number;

  @ApiProperty({ example: 1 })
  count: number;
}

export class CategoryExpenseDto {
  @ApiProperty({ type: [CategoryDto] })
  categories: CategoryDto[];

  @ApiProperty({ example: 210000 })
  totalExpenses: number;
}

export class RecurringExpenseItemDto {
  @ApiProperty({ example: 'LOYER' })
  description: string;

  @ApiProperty({ example: 80000 })
  averageAmount: number;

  @ApiProperty({ example: 'MONTHLY' })
  frequency: string;

  @ApiProperty({ example: 3 })
  occurrences: number;

  @ApiProperty({ example: '2024-04-01' })
  nextExpectedDate: string;

  @ApiProperty({ example: 'LOGEMENT' })
  category: string;
}

export class RecurringExpenseDto {
  @ApiProperty({ type: [RecurringExpenseItemDto] })
  recurringExpenses: RecurringExpenseItemDto[];

  @ApiProperty({ example: 125000 })
  totalRecurringAmount: number;

  @ApiProperty({ example: 2 })
  totalRecurringCount: number;
}

export class VariableTransactionDto {
  @ApiProperty({ example: 'RETRAIT GAB' })
  description: string;

  @ApiProperty({ example: 20000 })
  amount: number;

  @ApiProperty({ example: '2024-01-10' })
  date: string;
}

export class VariableExpenseAnalyticsDto {
  @ApiProperty({ example: 210000 })
  totalExpenses: number;

  @ApiProperty({ example: 125000 })
  recurringExpenses: number;

  @ApiProperty({ example: 85000 })
  variableExpenses: number;

  @ApiProperty({ example: 40.5 })
  variablePercent: number;

  @ApiProperty({ type: [VariableTransactionDto] })
  variableTransactions: VariableTransactionDto[];
}

export class ExpenseRatioDto {
  @ApiProperty({ example: 275000 })
  totalRevenues: number;

  @ApiProperty({ example: 210000 })
  totalExpenses: number;

  @ApiProperty({ example: 76.4 })
  ratio: number;

  @ApiProperty({ example: 'ATTENTION' })
  ratioLabel: string;

  @ApiProperty({ example: 50 })
  score: number;

  @ApiProperty({ example: 'Vous d\u00e9pensez 76% de vos revenus ce mois' })
  interpretation: string;
}

export class DailyBalanceDto {
  @ApiProperty({ example: '2024-01-01' })
  date: string;

  @ApiProperty({ example: 180000 })
  balance: number;
}

export class AverageBalanceResponseDto {
  @ApiProperty({ example: '2024-01' })
  month: string;

  @ApiProperty({ example: 125000 })
  averageBalance: number;

  @ApiProperty({ type: [DailyBalanceDto] })
  dailyBalances: DailyBalanceDto[];
}

export class BalanceExtremesResponseDto {
  @ApiProperty()
  minimum: { amount: number; date: string };

  @ApiProperty()
  maximum: { amount: number; date: string };

  @ApiProperty({ example: 295000 })
  range: number;
}

export class OverdraftAnalyticsResponseDto {
  @ApiProperty({ example: 3 })
  overdraftDays: number;

  @ApiProperty({ example: 31 })
  totalDays: number;

  @ApiProperty({ example: 9.7 })
  overdraftRate: number;

  @ApiProperty({ example: 'ATTENTION' })
  overdraftLabel: string;

  @ApiProperty({ example: 70 })
  score: number;

  @ApiProperty({ example: ['2024-01-20', '2024-01-21', '2024-01-22'] })
  overdraftDates: string[];
}

export class NegativePeriodDto {
  @ApiProperty({ example: '2024-01-20' })
  from: string;

  @ApiProperty({ example: '2024-01-22' })
  to: string;

  @ApiProperty({ example: 3 })
  durationDays: number;

  @ApiProperty({ example: -15000 })
  minBalance: number;
}

export class NegativePeriodsResponseDto {
  @ApiProperty({ type: [NegativePeriodDto] })
  negativePeriods: NegativePeriodDto[];

  @ApiProperty({ example: 3 })
  totalNegativeDays: number;

  @ApiProperty({ example: 3 })
  averageDuration: number;

  @ApiProperty({ example: 3 })
  maxDuration: number;

  @ApiProperty()
  longestPeriod: { from: string; to: string } | null;
}

export class BalanceVolatilityResponseDto {
  @ApiProperty({ example: 125000 })
  averageBalance: number;

  @ApiProperty({ example: 48000 })
  stdDev: number;

  @ApiProperty({ example: 38.4 })
  coefficientOfVariation: number;

  @ApiProperty({ example: 'INSTABLE' })
  @ApiProperty({ example: 35 })
  score: number;
}

export class DetectedCreditDto {
  @ApiProperty({ example: 'REMBOURSEMENT PRET' })
  description: string;

  @ApiProperty({ example: 45000 })
  monthlyAmount: number;

  @ApiProperty({ example: '2024-01-05' })
  firstDetected: string;

  @ApiProperty({ example: 3 })
  occurences: number;

  @ApiProperty({ example: 'HIGH' })
  confidence: string;
}

export class DebtDto {
  @ApiProperty({ type: [DetectedCreditDto] })
  detectedCredits: DetectedCreditDto[];

  @ApiProperty({ example: 45000 })
  totalMonthlyDebt: number;
}

export class TotalDebtItemDto {
  @ApiProperty({ example: 'REMBOURSEMENT CREDIT HABITAT' })
  description: string;
  @ApiProperty({ example: 45000 })
  monthlyAmount: number;
  @ApiProperty({ example: 18 })
  estimatedRemainingMonths: number;
  @ApiProperty({ example: 810000 })
  estimatedRemainingDebt: number;
}

export class TotalDebtResponseDto {
  @ApiProperty({ type: [TotalDebtItemDto] })
  debts: TotalDebtItemDto[];
  @ApiProperty({ example: 810000 })
  totalEstimatedDebt: number;
  @ApiProperty({ example: 45000 })
  totalMonthlyCommitments: number;
}

export class MonthlyPaymentsBreakdownDto {
  @ApiProperty({ example: 'CREDIT HABITAT' })
  description: string;
  @ApiProperty({ example: 45000 })
  amount: number;
  @ApiProperty({ example: 100 })
  percent: number;
}

export class MonthlyPaymentsResponseDto {
  @ApiProperty({ example: 45000 })
  totalMonthlyPayments: number;
  @ApiProperty({ type: [MonthlyPaymentsBreakdownDto] })
  breakdown: MonthlyPaymentsBreakdownDto[];
}

export class DebtRatioResponseDto {
  @ApiProperty({ example: 250000 })
  monthlyIncome: number;
  @ApiProperty({ example: 45000 })
  monthlyDebtPayments: number;
  @ApiProperty({ example: 18 })
  debtRatio: number;
  @ApiProperty({ example: 33 })
  bceaoThreshold: number;
  @ApiProperty({ example: 'SAIN' })
  label: string;
  @ApiProperty({ example: 100 })
  score: number;
  @ApiProperty({ example: 15 })
  margin: number;
  @ApiProperty({ example: 'Vous etes en dessous du seuil BCEAO de 33%' })
  interpretation: string;
}

export class RepaymentHistoryItemDto {
  @ApiProperty({ example: '2024-01' })
  month: string;
  @ApiProperty({ example: true })
  paid: boolean;
  @ApiProperty({ example: 0 })
  daysFromExpected: number;
}

export class RepaymentHistoryResponseDto {
  @ApiProperty({ example: 6 })
  monthsAnalyzed: number;
  @ApiProperty({ example: 6 })
  paymentsOnTime: number;
  @ApiProperty({ example: 100 })
  regularityRate: number;
  @ApiProperty({ example: 100 })
  score: number;
  @ApiProperty({ type: [RepaymentHistoryItemDto] })
  history: RepaymentHistoryItemDto[];
}
