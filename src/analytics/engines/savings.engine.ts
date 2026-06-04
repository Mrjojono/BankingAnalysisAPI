import { Injectable } from '@nestjs/common';
import {
  Transaction,
  SavingsRateAnalytics,
  SavingsFrequencyAnalytics,
  SavingsRetentionAnalytics,
  DailyBalance,
  Entry,
} from '../types';
import Decimal from 'decimal.js';
import { filterEntries } from '../helper';
import { Classifier } from '../shared/classifier';

import { ANALYTICS_CONSTANTS } from '../config/constants';

@Injectable()
export class SavingsEngine {
  constructor(private classifier: Classifier) {}

  /**
   * Taux d'épargne
   * Épargne nette = Revenus - Dépenses - Remboursements
   */
  async calculateSavingsRate(
    monthlyIncome: number,
    monthlyExpenses: number,
    monthlyDebtPayments: number,
  ): Promise<SavingsRateAnalytics> {
    const netSavings = new Decimal(monthlyIncome)
      .minus(monthlyExpenses)
      .minus(monthlyDebtPayments);

    const savingsRate =
      monthlyIncome > 0
        ? netSavings.div(monthlyIncome).times(100).toDP(1).toNumber()
        : 0;

    const garmanForgueThreshold =
      ANALYTICS_CONSTANTS.GARMAN_FORGUE_SAVINGS_RATE_THRESHOLD;
    let label: string;
    let score: number;

    if (savingsRate >= 20) {
      label = 'EXCELLENT';
      score = 100;
    } else if (savingsRate >= 10) {
      label = 'BIEN';
      score = 75;
    } else if (savingsRate >= 5) {
      label = 'MOYEN';
      score = 45;
    } else if (savingsRate > 0) {
      label = 'FAIBLE';
      score = 20;
    } else {
      label = 'CRITIQUE';
      score = 0;
    }

    return {
      monthlyIncome,
      monthlyExpenses,
      monthlyDebtPayments,
      netSavings: netSavings.toNumber(),
      savingsRate,
      label,
      score,
      garmanForgueThreshold,
    };
  }

  /**
   * Fréquence des dépôts d'épargne (Hybride)
   */
  async calculateSavingsFrequency(
    entries: Entry[],
    customerId: string,
    savingsAccounts: any[], // BankAccount from Prisma include account
    months: number = 6,
  ): Promise<SavingsFrequencyAnalytics> {
    const now = new Date();
    const depositsByMonth: SavingsFrequencyAnalytics['depositsByMonth'] = [];
    let monthsWithSavings = 0;
    let totalDepositAmount = new Decimal(0);
    let totalDepositsCount = 0;

    const savingsAccountIds = new Set(
      savingsAccounts.map((sa) => sa.accountId),
    );

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const monthStr = targetDate.toISOString().slice(0, 7);

      const monthEntries = filterEntries(entries, {
        year: targetDate.getUTCFullYear(),
        month: targetDate.getUTCMonth() + 1,
      });

      let monthSavedAmount = new Decimal(0);
      let hasSaved = false;

      for (const entry of monthEntries) {
        // Approche Comptable : CREDIT vers compte SAVINGS
        const isToSavingsAccount =
          entry.direction === 'CREDIT' &&
          savingsAccountIds.has(entry.accountId);

        // Approche Sémantique
        const isSavingsDescription =
          entry.transaction.description?.toUpperCase().includes('EPARGNE') ||
          entry.transaction.description?.toUpperCase().includes('SAVINGS');

        if (
          (isToSavingsAccount || isSavingsDescription) &&
          entry.direction === 'CREDIT'
        ) {
          monthSavedAmount = monthSavedAmount.plus(
            new Decimal(entry.amount.toString()),
          );
          hasSaved = true;
          totalDepositsCount++;
        }
      }

      if (hasSaved) {
        monthsWithSavings++;
        totalDepositAmount = totalDepositAmount.plus(monthSavedAmount);
      }

      depositsByMonth.push({
        month: monthStr,
        saved: hasSaved,
        amount: monthSavedAmount.toNumber(),
      });
    }

    const regularityRate = Math.round((monthsWithSavings / months) * 1000) / 10;

    let score = 0;
    if (regularityRate >= 80) score = 100;
    else if (regularityRate >= 60) score = 70;
    else if (regularityRate >= 40) score = 35;
    else score = 10;

    return {
      monthsWithSavings,
      totalMonths: months,
      regularityRate,
      score,
      averageDepositAmount:
        totalDepositsCount > 0
          ? totalDepositAmount.div(totalDepositsCount).toDP(0).toNumber()
          : 0,
      depositsByMonth: depositsByMonth.reverse(),
    };
  }

  /**
   * Capacité de rétention
   */
  async calculateRetentionCapacity(
    transactions: Transaction[],
    dailyBalances: DailyBalance[],
    customerId: string,
    months: number = 3,
  ): Promise<SavingsRetentionAnalytics> {
    const now = new Date();
    const retentionByMonth: SavingsRetentionAnalytics['retentionByMonth'] = [];

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const monthStr = targetDate.toISOString().slice(0, 7);

      const monthCredits = transactions.filter(
        (tx) =>
          tx.receiverCustomerId === customerId &&
          tx.transactionDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
          tx.transactionDate.getUTCMonth() + 1 === targetDate.getUTCMonth() + 1,
      );

      let totalRetentionDays = 0;
      let incomeCount = 0;

      for (const income of monthCredits) {
        const incomeDateStr = income.transactionDate
          .toISOString()
          .split('T')[0];
        const incomeIdx = dailyBalances.findIndex(
          (d) => d.date === incomeDateStr,
        );

        if (incomeIdx === -1) continue;

        const prevBalance =
          incomeIdx > 0 ? dailyBalances[incomeIdx - 1].balance : 0;

        let days = 0;
        for (let j = incomeIdx; j < dailyBalances.length; j++) {
          if (dailyBalances[j].balance <= prevBalance) {
            break;
          }
          days++;
        }

        totalRetentionDays += days;
        incomeCount++;
      }

      retentionByMonth.push({
        month: monthStr,
        retentionDays:
          incomeCount > 0 ? Math.round(totalRetentionDays / incomeCount) : 0,
      });
    }

    const avgRetention =
      retentionByMonth.length > 0
        ? Math.round(
            retentionByMonth.reduce((s, r) => s + r.retentionDays, 0) /
              retentionByMonth.length,
          )
        : 0;

    let label: string;
    let score: number;

    if (avgRetention >= 25) {
      label = 'EXCELLENTE';
      score = 100;
    } else if (avgRetention >= 15) {
      label = 'MOYENNE';
      score = 50;
    } else {
      label = 'FAIBLE';
      score = 20;
    }

    return {
      averageRetentionDays: avgRetention,
      label,
      score,
      retentionByMonth: retentionByMonth.reverse(),
      interpretation: `En moyenne votre argent reste ${avgRetention} jours sur votre compte`,
    };
  }
}
