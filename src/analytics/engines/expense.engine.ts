import { Injectable } from '@nestjs/common';
import {
  Expense,
  CategoryExpense,
  RecurringExpense,
  VariableExpenseAnalytics,
  ExpenseRatioAnalytics,
  Entry,
} from '../types';
import Decimal from 'decimal.js';
import { Classifier } from '../shared/classifier';
import { filterEntries, normalizeDescription } from '../helper';

import { ANALYTICS_CONSTANTS } from '../config/constants';

/**
 * Resultat de la detection des depenses recurrentes.
 */
type RecurringDetectionResult = {
  recurringExpenses: RecurringExpense['recurringExpenses'];
  totalRecurringAmount: number;
  totalRecurringCount: number;
  recurringTransactionIds: Set<string>;
};

@Injectable()
export class ExpenseEngine {
  constructor(private classifier: Classifier) {}

  /**
   * Detection des depenses basee sur les DEBIT entries.
   */
  async getExpenses(
    entries: Entry[],
    customerId: string,
    year?: number,
    month?: number,
    from?: Date,
    to?: Date,
  ): Promise<Expense> {
    const debits = filterEntries(entries, {
      direction: 'DEBIT',
      accountType: 'CHECKING',
      includeMobileMoney: true,
      year,
      month,
      from,
      to,
    });

    if (debits.length === 0) {
      return {
        totalExpenses: 0,
        count: 0,
        averageTransactionAmount: 0,
        largestExpense: { amount: 0, description: '', date: '1970-01-01' },
      };
    }

    let totalDebitAmount = new Decimal(0);
    let largestExpenseEntry: Entry | null = null;

    for (const entry of debits) {
      const amount = new Decimal(entry.amount.toString());
      totalDebitAmount = totalDebitAmount.plus(amount);

      if (
        !largestExpenseEntry ||
        amount.greaterThan(new Decimal(largestExpenseEntry.amount.toString()))
      ) {
        largestExpenseEntry = entry;
      }
    }

    return {
      totalExpenses: totalDebitAmount.toNumber(),
      count: debits.length,
      averageTransactionAmount: totalDebitAmount
        .div(debits.length)
        .toDP(0)
        .toNumber(),
      largestExpense: {
        amount: new Decimal(largestExpenseEntry!.amount.toString()).toNumber(),
        description: largestExpenseEntry!.transaction.description ?? '',
        date: new Date(largestExpenseEntry!.transaction.transactionDate)
          .toISOString()
          .split('T')[0],
      },
    };
  }

  /**
   * Categories de depenses.
   */
  async getCategoryExpenses(
    entries: Entry[],
    customerId: string,
    year?: number,
    month?: number,
    from?: Date,
    to?: Date,
  ): Promise<CategoryExpense> {
    const debits = filterEntries(entries, {
      direction: 'DEBIT',
      accountType: 'CHECKING',
      includeMobileMoney: true,
      year,
      month,
      from,
      to,
    });

    const grouped = new Map<string, { amount: Decimal; count: number }>();

    for (const entry of debits) {
      const category = await this.classifier.categorizeWithCache(
        entry.transaction.description ?? '',
        customerId,
      );
      const amount = new Decimal(entry.amount.toString());
      const existing = grouped.get(category);

      if (existing) {
        grouped.set(category, {
          amount: existing.amount.plus(amount),
          count: existing.count + 1,
        });
      } else {
        grouped.set(category, { amount, count: 1 });
      }
    }

    let totalAmount = new Decimal(0);
    for (const { amount } of grouped.values())
      totalAmount = totalAmount.plus(amount);

    const categories = Array.from(grouped.entries()).map(
      ([category, { amount, count }]) => ({
        category,
        amount: amount.toNumber(),
        percent: totalAmount.gt(0)
          ? amount.div(totalAmount).times(100).toDP(1).toNumber()
          : 0,
        count,
      }),
    );

    categories.sort((a, b) => b.amount - a.amount);
    return { categories, totalExpenses: totalAmount.toNumber() };
  }

  /**
   * Depenses recurrentes.
   */
  async detectRecurringExpenses(
    entries: Entry[],
    customerId: string,
    months: number = 3,
    year?: number,
    month?: number,
    from?: Date,
    to?: Date,
  ): Promise<RecurringDetectionResult> {
    const MIN_OCCURRENCES = ANALYTICS_CONSTANTS.MIN_RECURRING_OCCURRENCES;
    const AMOUNT_VARIATION_THRESHOLD =
      ANALYTICS_CONSTANTS.AMOUNT_VARIATION_THRESHOLD;

    // 1. Définir la période d'analyse
    const now = new Date();
    const refYear = year ?? now.getUTCFullYear();
    const refMonth = month ?? now.getUTCMonth() + 1;
    const analysisDate =
      to ?? new Date(Date.UTC(refYear, refMonth, 0, 23, 59, 59, 999));
    const cutoffDate =
      from ??
      new Date(
        analysisDate.getTime() -
          months *
            ANALYTICS_CONSTANTS.DAYS_IN_MONTH *
            ANALYTICS_CONSTANTS.MS_IN_DAY,
      );

    const debits = filterEntries(entries, {
      direction: 'DEBIT',
      accountType: 'CHECKING',
      includeMobileMoney: true,
      from: cutoffDate,
      to: analysisDate,
    });

    const groupedByDescription = new Map<string, Entry[]>();
    for (const entry of debits) {
      if (entry.transaction.description) {
        const normalizedDesc = normalizeDescription(
          entry.transaction.description,
        );
        const group = groupedByDescription.get(normalizedDesc) || [];
        group.push(entry);
        groupedByDescription.set(normalizedDesc, group);
      }
    }

    const recurringExpenses: RecurringExpense['recurringExpenses'] = [];
    const recurringTransactionIds = new Set<string>();

    for (const group of groupedByDescription.values()) {
      if (group.length < MIN_OCCURRENCES) continue;

      group.sort(
        (a, b) =>
          new Date(a.transaction.transactionDate).getTime() -
          new Date(b.transaction.transactionDate).getTime(),
      );

      let isRecurring = true;
      const amounts = group.map((e) => new Decimal(e.amount.toString()));

      for (let i = 1; i < group.length; i++) {
        const prevDate = new Date(group[i - 1].transaction.transactionDate);
        const currDate = new Date(group[i].transaction.transactionDate);
        const daysDiff =
          (currDate.getTime() - prevDate.getTime()) /
          ANALYTICS_CONSTANTS.MS_IN_DAY;

        if (
          daysDiff < ANALYTICS_CONSTANTS.DAYS_INTERVAL_MIN ||
          daysDiff > ANALYTICS_CONSTANTS.DAYS_INTERVAL_MAX
        ) {
          isRecurring = false;
          break;
        }

        const amtA = new Decimal(group[i - 1].amount.toString());
        const amtB = new Decimal(group[i].amount.toString());
        if (
          amtA.isZero() ||
          amtA.minus(amtB).abs().div(amtA).gt(AMOUNT_VARIATION_THRESHOLD)
        ) {
          isRecurring = false;
          break;
        }
      }

      if (isRecurring) {
        group.forEach((e) => recurringTransactionIds.add(e.transactionId));
        const avgAmount = amounts
          .reduce((sum, val) => sum.plus(val), new Decimal(0))
          .div(amounts.length);

        recurringExpenses.push({
          description: group[0].transaction.description!,
          averageAmount: avgAmount.toDP(0).toNumber(),
          frequency: 'MONTHLY',
          occurrences: group.length,
          nextExpectedDate: (() => {
            const lastDate =
              group[group.length - 1].transaction.transactionDate;
            const avgInterval =
              group.length > 1
                ? (lastDate.getTime() -
                    new Date(group[0].transaction.transactionDate).getTime()) /
                  (group.length - 1)
                : ANALYTICS_CONSTANTS.DAYS_IN_MONTH *
                  ANALYTICS_CONSTANTS.MS_IN_DAY;
            return new Date(lastDate.getTime() + avgInterval)
              .toISOString()
              .split('T')[0];
          })(),
          category: await this.classifier.categorizeWithCache(
            group[0].transaction.description!,
            customerId,
          ),
        });
      }
    }

    return {
      recurringExpenses,
      totalRecurringAmount: recurringExpenses.reduce(
        (sum, exp) => sum + exp.averageAmount,
        0,
      ),
      totalRecurringCount: recurringExpenses.length,
      recurringTransactionIds,
    };
  }

  async calculateVariableExpenses(
    entries: Entry[],
    customerId: string,
    year?: number,
    month?: number,
    from?: Date,
    to?: Date,
  ): Promise<VariableExpenseAnalytics> {
    const periodDebits = filterEntries(entries, {
      direction: 'DEBIT',
      accountType: 'CHECKING',
      includeMobileMoney: true,
      year,
      month,
      from,
      to,
    });
    const totalExpenses = periodDebits.reduce(
      (sum, e) => sum.plus(new Decimal(e.amount.toString())),
      new Decimal(0),
    );

    const { recurringTransactionIds } = await this.detectRecurringExpenses(
      entries,
      customerId,
      12,
      year,
      month,
      from,
      to,
    );

    const variableTransactions = periodDebits
      .filter((e) => !recurringTransactionIds.has(e.transactionId))
      .map((e) => ({
        id: e.transactionId,
        description: e.transaction.description ?? '',
        amount: new Decimal(e.amount.toString()).toNumber(),
        date: new Date(e.transaction.transactionDate)
          .toISOString()
          .split('T')[0],
      }));

    const recurringAmountInPeriod = periodDebits
      .filter((e) => recurringTransactionIds.has(e.transactionId))
      .reduce(
        (s, e) => s.plus(new Decimal(e.amount.toString())),
        new Decimal(0),
      );

    const variableExpenses = totalExpenses.minus(recurringAmountInPeriod);

    return {
      totalExpenses: totalExpenses.toNumber(),
      recurringExpenses: recurringAmountInPeriod.toNumber(),
      variableExpenses: variableExpenses.toNumber(),
      variablePercent: totalExpenses.gt(0)
        ? variableExpenses.div(totalExpenses).times(100).toDP(1).toNumber()
        : 0,
      variableTransactions,
    };
  }

  async calculateExpenseRatio(
    totalRevenues: number,
    totalExpenses: number,
  ): Promise<ExpenseRatioAnalytics> {
    const ratio =
      totalRevenues > 0
        ? new Decimal(totalExpenses)
            .div(totalRevenues)
            .times(100)
            .toDP(1)
            .toNumber()
        : totalExpenses > 0
          ? 100
          : 0;
    const { ratioLabel, score, interpretation } =
      Classifier.interpretRatio(ratio);
    return {
      totalRevenues,
      totalExpenses,
      ratio,
      ratioLabel,
      score,
      interpretation,
    };
  }
}
