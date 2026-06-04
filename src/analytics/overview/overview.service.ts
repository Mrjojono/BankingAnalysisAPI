import { Injectable } from '@nestjs/common';
import { TransactionFetcher } from '../shared/transaction.fetcher';
import { BalanceReconstructor } from '../shared/balance.reconstructor';
import { ExpenseEngine } from '../engines/expense.engine';
import { RevenueEngine } from '../engines/revenue.engine';
import { BalanceEngine } from '../engines/balance.engine';
import { DebtEngine } from '../engines/debt.engine';
import { SavingsEngine } from '../engines/savings.engine';
import { DashboardGateway } from '../../gateway/dashboard.gateway';
import { Classifier } from '../shared/classifier';
import { Entry } from '../types';

@Injectable()
export class OverviewService {
  constructor(
    private transactionFetcher: TransactionFetcher,
    private balanceReconstructor: BalanceReconstructor,
    private expenseEngine: ExpenseEngine,
    private revenueEngine: RevenueEngine,
    private balanceEngine: BalanceEngine,
    private debtEngine: DebtEngine,
    private savingsEngine: SavingsEngine,
    private gateway: DashboardGateway,
    private classifier: Classifier,
  ) {}

  /**
   * Résout la date de référence pour l'analyse.
   */
  private async resolveReferenceDate(
    customerId: string,
    year?: number,
    month?: number,
  ): Promise<{ refYear: number; refMonth: number; analysisDate: Date }> {
    const latestDate =
      await this.transactionFetcher.getLatestTransactionDate(customerId);
    const now = latestDate ?? new Date();

    const refYear = year ?? now.getUTCFullYear();
    const refMonth = month ?? now.getUTCMonth() + 1;

    let analysisDate: Date;
    if (month) {
      analysisDate = new Date(Date.UTC(refYear, refMonth, 0, 23, 59, 59, 999));
    } else if (year) {
      analysisDate = new Date(Date.UTC(refYear, 11, 31, 23, 59, 59, 999));
    } else {
      analysisDate = now;
    }

    return { refYear, refMonth, analysisDate };
  }

  /**
   * R\u00e9sout une p\u00e9riode (from/to) bas\u00e9e sur les param\u00e8tres ou la derni\u00e8re activit\u00e9.
   */
  private async resolveRange(
    customerId: string,
    from?: Date,
    to?: Date,
    year?: number,
    month?: number,
    lookbackMonths: number = 0,
  ) {
    if (from && to) return { startDate: from, endDate: to };

    const { refYear, refMonth, analysisDate } = await this.resolveReferenceDate(
      customerId,
      year,
      month,
    );

    let startDate: Date;
    if (month) {
      startDate = new Date(Date.UTC(refYear, refMonth - 1, 1));
    } else if (year) {
      startDate = new Date(Date.UTC(refYear, 0, 1));
    } else if (lookbackMonths > 0) {
      startDate = new Date(
        Date.UTC(
          analysisDate.getUTCFullYear(),
          analysisDate.getUTCMonth() - lookbackMonths,
          1,
        ),
      );
    } else {
      startDate = new Date(
        Date.UTC(analysisDate.getUTCFullYear(), analysisDate.getUTCMonth(), 1),
      );
    }

    return { startDate, endDate: analysisDate, refYear, refMonth };
  }

  /**
   * Méthode pivot : Récupère les écritures comptables certifiées du client.
   */
  private async getCertifiedEntries(
    customerId: string,
    from?: Date,
    to?: Date,
  ): Promise<Entry[]> {
    return await this.transactionFetcher.fetchCustomerEntries(
      customerId,
      from,
      to,
    );
  }

  async getExpenses(
    customerId: string,
    from?: Date,
    to?: Date,
    year?: number,
    month?: number,
  ) {
    this.gateway.emit('analytics_requested', { type: 'EXPENSES', customerId });
    const { refYear, refMonth } = await this.resolveRange(
      customerId,
      from,
      to,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);

    return await this.expenseEngine.getExpenses(
      entries,
      customerId,
      refYear,
      refMonth,
      from,
      to,
    );
  }

  async getCategoryExpenses(
    customerId: string,
    from?: Date,
    to?: Date,
    year?: number,
    month?: number,
  ) {
    this.gateway.emit('analytics_requested', {
      type: 'CATEGORIES',
      customerId,
    });
    const { refYear, refMonth } = await this.resolveRange(
      customerId,
      from,
      to,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);

    return await this.expenseEngine.getCategoryExpenses(
      entries,
      customerId,
      refYear,
      refMonth,
      from,
      to,
    );
  }

  async getRecurringExpenses(
    customerId: string,
    months: number = 3,
    year?: number,
    month?: number,
  ) {
    this.gateway.emit('analytics_requested', { type: 'RECURRING', customerId });
    const { refYear, refMonth } = await this.resolveReferenceDate(
      customerId,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);

    return await this.expenseEngine.detectRecurringExpenses(
      entries,
      customerId,
      months,
      refYear,
      refMonth,
    );
  }

  async getVariableExpenses(
    customerId: string,
    from?: Date,
    to?: Date,
    year?: number,
    month?: number,
  ) {
    this.gateway.emit('analytics_requested', { type: 'VARIABLE', customerId });
    const { refYear, refMonth } = await this.resolveRange(
      customerId,
      from,
      to,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);

    return await this.expenseEngine.calculateVariableExpenses(
      entries,
      customerId,
      refYear,
      refMonth,
      from,
      to,
    );
  }

  async getExpenseRatio(
    customerId: string,
    from?: Date,
    to?: Date,
    year?: number,
    month?: number,
  ) {
    this.gateway.emit('analytics_requested', { type: 'RATIO', customerId });
    const { startDate, endDate } = await this.resolveRange(
      customerId,
      from,
      to,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);

    const summary = await this.revenueEngine.buildFinancialSummary(
      entries,
      customerId,
      { from: startDate, to: endDate },
    );
    return await this.expenseEngine.calculateExpenseRatio(
      summary.totalCredits.amount,
      summary.totalDebits.amount,
    );
  }

  async getDebtAnalytics(
    customerId: string,
    from?: Date,
    to?: Date,
    year?: number,
    month?: number,
  ) {
    this.gateway.emit('analytics_requested', { type: 'DEBTS', customerId });
    const { refYear, refMonth, startDate, endDate } = await this.resolveRange(
      customerId,
      from,
      to,
      year,
      month,
    );
    const transactions =
      await this.transactionFetcher.fetchCustomerAllTransactions(customerId);

    return await this.debtEngine.detectDebts(
      transactions,
      customerId,
      refYear,
      refMonth,
      startDate,
      endDate,
    );
  }

  async getTotalDebt(customerId: string) {
    const transactions =
      await this.transactionFetcher.fetchCustomerAllTransactions(customerId);
    return await this.debtEngine.calculateTotalDebt(transactions, customerId);
  }

  async getMonthlyPayments(customerId: string) {
    const transactions =
      await this.transactionFetcher.fetchCustomerAllTransactions(customerId);
    return await this.debtEngine.calculateMonthlyPayments(
      transactions,
      customerId,
    );
  }

  async getDebtRatio(customerId: string, year?: number, month?: number) {
    const { refYear, refMonth } = await this.resolveReferenceDate(
      customerId,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);

    const revenues = await this.revenueEngine.computeRevenueAnalytics(
      entries,
      customerId,
      refYear,
      refMonth,
    );
    const transactions =
      await this.transactionFetcher.fetchCustomerAllTransactions(customerId);
    const debts = await this.debtEngine.detectDebts(
      transactions,
      customerId,
      refYear,
      refMonth,
    );

    return await this.debtEngine.calculateDebtRatio(
      revenues.currentMonth.total,
      debts.totalMonthlyDebt,
    );
  }

  async getRepaymentHistory(customerId: string, months: number = 6) {
    const transactions =
      await this.transactionFetcher.fetchCustomerAllTransactions(customerId);
    return await this.debtEngine.calculateRepaymentHistory(
      transactions,
      customerId,
      months,
    );
  }

  async getAverageBalance(customerId: string, year?: number, month?: number) {
    this.gateway.emit('analytics_requested', {
      type: 'AVG_BALANCE',
      customerId,
    });
    const { dailyBalances, refYear, refMonth } =
      await this.getMonthlyDailyBalances(customerId, year, month);
    return await this.balanceEngine.calculateAverageBalance(
      dailyBalances,
      refYear,
      refMonth,
    );
  }

  async getBalanceExtremes(customerId: string, year?: number, month?: number) {
    this.gateway.emit('analytics_requested', { type: 'EXTREMES', customerId });
    const { dailyBalances } = await this.getMonthlyDailyBalances(
      customerId,
      year,
      month,
    );
    return await this.balanceEngine.calculateExtremes(dailyBalances);
  }

  async getOverdraftFrequency(
    customerId: string,
    year?: number,
    month?: number,
  ) {
    this.gateway.emit('analytics_requested', {
      type: 'OVERDRAFTS',
      customerId,
    });
    const { dailyBalances } = await this.getMonthlyDailyBalances(
      customerId,
      year,
      month,
    );
    return await this.balanceEngine.calculateOverdraftFrequency(dailyBalances);
  }

  async getNegativePeriods(customerId: string, year?: number, month?: number) {
    this.gateway.emit('analytics_requested', {
      type: 'NEGATIVE_PERIODS',
      customerId,
    });
    const { dailyBalances } = await this.getMonthlyDailyBalances(
      customerId,
      year,
      month,
    );
    return await this.balanceEngine.calculateNegativePeriods(dailyBalances);
  }

  async getBalanceVolatility(
    customerId: string,
    year?: number,
    month?: number,
  ) {
    this.gateway.emit('analytics_requested', {
      type: 'VOLATILITY',
      customerId,
    });
    const { dailyBalances, refYear, refMonth } =
      await this.getMonthlyDailyBalances(customerId, year, month);
    const avgRes = await this.balanceEngine.calculateAverageBalance(
      dailyBalances,
      refYear,
      refMonth,
    );
    return await this.balanceEngine.calculateVolatility(
      dailyBalances,
      avgRes.averageBalance,
    );
  }

  private async getMonthlyDailyBalances(
    customerId: string,
    year?: number,
    month?: number,
  ) {
    const { refYear, refMonth } = await this.resolveReferenceDate(
      customerId,
      year,
      month,
    );
    const startOfMonth = new Date(Date.UTC(refYear, refMonth - 1, 1));
    const initialBalance = await this.balanceReconstructor.reconstructBalance(
      customerId,
      startOfMonth,
    );
    const entries = await this.getCertifiedEntries(customerId);

    return {
      dailyBalances: await this.balanceEngine.reconstructMonthlyDailyBalances(
        entries,
        customerId,
        initialBalance,
        refYear,
        refMonth,
      ),
      refYear,
      refMonth,
    };
  }

  async getCashFlow(
    customerId: string,
    from?: Date,
    to?: Date,
    year?: number,
    month?: number,
  ) {
    this.gateway.emit('analytics_requested', { type: 'CASHFLOW', customerId });
    const { startDate, endDate } = await this.resolveRange(
      customerId,
      from,
      to,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);
    return await this.revenueEngine.buildFinancialSummary(entries, customerId, {
      from: startDate,
      to: endDate,
    });
  }

  async getRevenueAnalytics(customerId: string, year?: number, month?: number) {
    this.gateway.emit('analytics_requested', { type: 'REVENUES', customerId });
    const { refYear, refMonth } = await this.resolveReferenceDate(
      customerId,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);
    return await this.revenueEngine.computeRevenueAnalytics(
      entries,
      customerId,
      refYear,
      refMonth,
    );
  }

  async getMonthlySummary(customerId: string, year?: number, month?: number) {
    this.gateway.emit('analytics_requested', {
      type: 'MONTHLY_SUMMARY',
      customerId,
    });
    const { refYear, refMonth } = await this.resolveReferenceDate(
      customerId,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);
    return await this.revenueEngine.monthlySummaryIncome(
      entries,
      customerId,
      refYear,
      refMonth,
    );
  }

  async getIncomeFrequency(customerId: string, year?: number, month?: number) {
    this.gateway.emit('analytics_requested', {
      type: 'INCOME_FREQ',
      customerId,
    });
    const { refYear, refMonth } = await this.resolveReferenceDate(
      customerId,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);
    return await this.revenueEngine.computeIncomeFrequency(
      entries,
      customerId,
      refYear,
      refMonth,
    );
  }

  async getRevenueSources(
    customerId: string,
    from?: Date,
    to?: Date,
    year?: number,
    month?: number,
  ) {
    this.gateway.emit('analytics_requested', {
      type: 'REVENUE_SOURCES',
      customerId,
    });
    const { startDate, endDate } = await this.resolveRange(
      customerId,
      from,
      to,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);
    return await this.revenueEngine.computeRevenueSources(
      entries,
      customerId,
      startDate,
      endDate,
    );
  }

  async getRevenueVariation(
    customerId: string,
    months: number = 6,
    year?: number,
    month?: number,
  ) {
    this.gateway.emit('analytics_requested', {
      type: 'REVENUE_VARIATION',
      customerId,
    });
    const { refYear, refMonth } = await this.resolveReferenceDate(
      customerId,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);
    return await this.revenueEngine.computeRevenueVariation(
      entries,
      customerId,
      months,
      refYear,
      refMonth,
    );
  }

  async getSavingsRate(customerId: string, year?: number, month?: number) {
    this.gateway.emit('analytics_requested', {
      type: 'SAVINGS_RATE',
      customerId,
    });
    const { refYear, refMonth } = await this.resolveReferenceDate(
      customerId,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);
    const transactions =
      await this.transactionFetcher.fetchCustomerAllTransactions(customerId);

    const revenues = await this.revenueEngine.computeRevenueAnalytics(
      entries,
      customerId,
      refYear,
      refMonth,
    );
    const expenses = await this.expenseEngine.getExpenses(
      entries,
      customerId,
      refYear,
      refMonth,
    );
    const debts = await this.debtEngine.detectDebts(
      transactions,
      customerId,
      refYear,
      refMonth,
    );

    return await this.savingsEngine.calculateSavingsRate(
      revenues.currentMonth.total,
      expenses.totalExpenses,
      debts.totalMonthlyDebt,
    );
  }

  async getSavingsFrequency(customerId: string, months: number = 6) {
    this.gateway.emit('analytics_requested', {
      type: 'SAVINGS_FREQ',
      customerId,
    });
    const entries = await this.getCertifiedEntries(customerId);
    const savingsAccounts =
      await this.transactionFetcher.fetchCustomerAccountsByType(
        customerId,
        'SAVINGS',
      );

    return await this.savingsEngine.calculateSavingsFrequency(
      entries,
      customerId,
      savingsAccounts,
      months,
    );
  }

  async getRetentionCapacity(customerId: string, months: number = 3) {
    this.gateway.emit('analytics_requested', { type: 'RETENTION', customerId });
    const { dailyBalances } = await this.getMonthlyDailyBalances(customerId);
    const transactions =
      await this.transactionFetcher.fetchCustomerAllTransactions(customerId);

    return await this.savingsEngine.calculateRetentionCapacity(
      transactions,
      dailyBalances,
      customerId,
      months,
    );
  }

  async getFullOverview(customerId: string, year?: number, month?: number) {
    this.gateway.emit('analytics_requested', {
      type: 'FULL_OVERVIEW',
      customerId,
    });
    const { refYear, refMonth, analysisDate } = await this.resolveReferenceDate(
      customerId,
      year,
      month,
    );
    const entries = await this.getCertifiedEntries(customerId);
    const transactions =
      await this.transactionFetcher.fetchCustomerAllTransactions(customerId);

    const to = analysisDate;
    const from = new Date(
      Date.UTC(
        analysisDate.getUTCFullYear(),
        analysisDate.getUTCMonth() - 6,
        1,
      ),
    );

    const [
      cashFlow,
      revenueAnalytics,
      monthlySummary,
      incomeFrequency,
      revenueSources,
      revenueVariation,
      debt,
    ] = await Promise.all([
      this.revenueEngine.buildFinancialSummary(entries, customerId, {
        from,
        to,
      }),
      this.revenueEngine.computeRevenueAnalytics(
        entries,
        customerId,
        refYear,
        refMonth,
      ),
      this.revenueEngine.monthlySummaryIncome(
        entries,
        customerId,
        refYear,
        refMonth,
      ),
      this.revenueEngine.computeIncomeFrequency(
        entries,
        customerId,
        refYear,
        refMonth,
      ),
      this.revenueEngine.computeRevenueSources(entries, customerId, from, to),
      this.revenueEngine.computeRevenueVariation(
        entries,
        customerId,
        6,
        refYear,
        refMonth,
      ),
      this.debtEngine.detectDebts(
        transactions,
        customerId,
        refYear,
        refMonth,
        from,
        to,
      ),
    ]);

    return {
      cashFlow,
      revenueAnalytics,
      monthlySummary,
      incomeFrequency,
      revenueSources,
      revenueVariation,
      debt,
    };
  }

  async previewClassifier(customerId: string, from?: Date, to?: Date) {
    const transactions =
      await this.transactionFetcher.fetchCustomerTransactionsBetweenDates(
        customerId,
        from ?? new Date(0),
        to ?? new Date(),
      );
    const results = await Promise.all(
      transactions.map(async (tx) => ({
        description: tx.description,
        amount: Number(tx.amount),
        category: await this.classifier.categorizeWithCache(
          tx.description ?? '',
          customerId,
        ),
        date: tx.transactionDate.toISOString().split('T')[0],
      })),
    );
    return { customerId, results };
  }

  async recordFeedback(
    customerId: string,
    description: string,
    correctCategory: any,
  ) {
    await this.classifier.recordFeedback(
      customerId,
      description,
      correctCategory,
    );
    this.gateway.emit('feedback_saved', {
      customerId,
      description,
      correctCategory,
    });
    return { success: true };
  }
}
