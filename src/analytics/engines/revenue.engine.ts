import Decimal from 'decimal.js';
import { filterTransactions } from '../helper';
import {
  RevenueAnalytics,
  CashFlowAnalytics,
  MonthlySummary,
  IncomeFrequency,
  Transaction,
  RevenueSources,
  RevenueSource,
  MonthlyRevenue,
  RevenueVariation,
  Period,
} from '../types';
import { Classifier } from '../shared/classifier';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RevenueEngine {
  constructor(private classifier: Classifier) {}

  /**
   * Construit un résumé financier pour les transactions et le client donnés dans la période spécifiée.
   */
  async buildFinancialSummary(
    transactions: Transaction[],
    customerId: string,
    period: Period,
  ): Promise<CashFlowAnalytics> {
    // On utilise le helper pour déjà filtrer par client et dates si besoin
    const periodTransactions = filterTransactions(transactions, {
      customerId,
      from: period.from,
      to: period.to,
    });

    let creditCount = 0;
    let debitCount = 0;
    let creditAmount = new Decimal(0);
    let debitAmount = new Decimal(0);

    for (const tx of periodTransactions) {
      const amount = new Decimal(tx.amount.toString());

      if (tx.receiverCustomerId === customerId) {
        creditCount++;
        creditAmount = creditAmount.plus(amount);
      } else if (tx.senderCustomerId === customerId) {
        debitCount++;
        debitAmount = debitAmount.plus(amount);
      }
    }

    const netFlow = creditAmount.minus(debitAmount);

    return {
      period: {
        from: period.from.toISOString().split('T')[0],
        to: period.to.toISOString().split('T')[0],
      },
      totalCredits: { count: creditCount, amount: creditAmount.toNumber() },
      totalDebits: { count: debitCount, amount: debitAmount.toNumber() },
      netFlow: netFlow.toNumber(),
    };
  }

  /**
   * Calcule les indicateurs de revenu d'un client.
   */
  async computeRevenueAnalytics(
    transactions: Transaction[],
    customerId: string,
    year?: number,
    month?: number,
  ): Promise<RevenueAnalytics> {
    return this.monthlySummaryIncome(transactions, customerId, year, month);
  }

  /**
   * Calcule le résumé mensuel d'income pour un client donné.
   */
  async monthlySummaryIncome(
    transactions: Transaction[],
    customerId: string,
    year?: number,
    month?: number,
  ): Promise<MonthlySummary & { rolling30Days: number }> {
    const now = new Date();
    const refYear = year ?? now.getUTCFullYear();
    const refMonth = month ?? now.getUTCMonth() + 1;
    const analysisDate = new Date(
      Date.UTC(refYear, refMonth, 0, 23, 59, 59, 999),
    );

    // 1. Credits du mois cible via helper
    const targetMonthCredits = filterTransactions(transactions, {
      customerId,
      type: 'CREDIT',
      year: refYear,
      month: refMonth,
    });

    // 2. Credits du mois précédent
    const prevDate = new Date(Date.UTC(refYear, refMonth - 1, 0));
    const previousMonthCredits = filterTransactions(transactions, {
      customerId,
      type: 'CREDIT',
      year: prevDate.getUTCFullYear(),
      month: prevDate.getUTCMonth() + 1,
    });

    // 3. Rolling 30 days via helper
    const rollingCutoff = new Date(
      analysisDate.getTime() - 30 * 24 * 60 * 60 * 1000,
    );
    const rollingCredits = filterTransactions(transactions, {
      customerId,
      type: 'CREDIT',
      from: rollingCutoff,
      to: analysisDate,
    });

    // 4. Moyenne des 6 derniers mois
    const creditsByMonth = new Map<string, Decimal>();
    const last6MonthsKeys: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(Date.UTC(refYear, refMonth - i, 0));
      const key = d.toISOString().slice(0, 7);
      last6MonthsKeys.push(key);
      creditsByMonth.set(key, new Decimal(0));
    }

    // On peuple la map pour les 6 mois via un seul filtrage group\u00e9
    const sixMonthsStart = new Date(Date.UTC(refYear, refMonth - 6, 1));
    const sixMonthsTxs = filterTransactions(transactions, {
      customerId,
      type: 'CREDIT',
      from: sixMonthsStart,
      to: analysisDate,
    });

    for (const tx of sixMonthsTxs) {
      const key = tx.transactionDate.toISOString().slice(0, 7);
      if (creditsByMonth.has(key)) {
        creditsByMonth.set(
          key,
          creditsByMonth.get(key)!.plus(new Decimal(tx.amount.toString())),
        );
      }
    }

    const currentTotal = targetMonthCredits.reduce(
      (s, t) => s.plus(new Decimal(t.amount.toString())),
      new Decimal(0),
    );
    const previousTotal = previousMonthCredits.reduce(
      (s, t) => s.plus(new Decimal(t.amount.toString())),
      new Decimal(0),
    );
    const rollingTotal = rollingCredits.reduce(
      (s, t) => s.plus(new Decimal(t.amount.toString())),
      new Decimal(0),
    );
    const sum6 = Array.from(creditsByMonth.values()).reduce(
      (a, b) => a.plus(b),
      new Decimal(0),
    );

    let variationPercent = 0;
    if (previousTotal.gt(0)) {
      variationPercent = currentTotal
        .minus(previousTotal)
        .div(previousTotal)
        .times(100)
        .toNumber();
    } else if (currentTotal.gt(0)) {
      variationPercent = 100;
    }

    return {
      currentMonth: {
        total: currentTotal.toNumber(),
        month: analysisDate.toISOString().slice(0, 7),
      },
      previousMonth: {
        total: previousTotal.toNumber(),
        month: prevDate.toISOString().slice(0, 7),
      },
      averageLast6Months: sum6.div(6).toNumber(),
      variationPercent: Math.round(variationPercent * 100) / 100,
      trend:
        variationPercent > 5 ? 'UP' : variationPercent < -5 ? 'DOWN' : 'STABLE',
      rolling30Days: rollingTotal.toNumber(),
    };
  }

  async computeIncomeFrequency(
    transactions: Transaction[],
    customerId: string,
    year?: number,
    month?: number,
  ): Promise<IncomeFrequency> {
    const now = new Date();
    const refYear = year ?? now.getUTCFullYear();
    const refMonth = month ?? now.getUTCMonth() + 1;
    const analysisDate = new Date(
      Date.UTC(refYear, refMonth, 0, 23, 59, 59, 999),
    );
    const cutoff = new Date(analysisDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const credits = filterTransactions(transactions, {
      customerId,
      type: 'CREDIT',
      from: cutoff,
      to: analysisDate,
    }).sort(
      (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime(),
    );

    const entriesPerMonth = credits.length;
    const entriesPerWeek = Math.round((credits.length / 4) * 100) / 100;

    if (credits.length < 2) {
      return {
        entriesPerMonth,
        entriesPerWeek,
        averageIntervalDays: 0,
        stabilityStdDev: 0,
        coefficientOfVariation: 0,
        stabilityLabel: 'INSUFFICIENT_DATA',
        stabilityScore: 0,
      };
    }

    const intervals: number[] = [];
    for (let i = 1; i < credits.length; i++) {
      intervals.push(
        (credits[i].transactionDate.getTime() -
          credits[i - 1].transactionDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
    }

    const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const variance =
      intervals
        .map((v) => Math.pow(v - avgInterval, 2))
        .reduce((s, v) => s + v, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgInterval > 0 ? (stdDev / avgInterval) * 100 : 0;

    const stabilityLabel: any =
      cv < 10
        ? 'VERY_STABLE'
        : cv < 25
          ? 'STABLE'
          : cv < 50
            ? 'UNSTABLE'
            : 'VERY_UNSTABLE';

    return {
      entriesPerMonth,
      entriesPerWeek,
      averageIntervalDays: Math.round(avgInterval * 10) / 10,
      stabilityStdDev: Math.round(stdDev * 100) / 100,
      coefficientOfVariation: Math.round(cv * 100) / 100,
      stabilityLabel,
      stabilityScore: cv < 10 ? 100 : cv < 25 ? 70 : cv < 50 ? 35 : 0,
    };
  }

  async computeRevenueSources(
    transactions: Transaction[],
    customerId: string,
    from: Date,
    to: Date,
  ): Promise<RevenueSources> {
    const credits = filterTransactions(transactions, {
      customerId,
      type: 'CREDIT',
      from,
      to,
    });

    const grouped = new Map<string, { amount: Decimal; count: number }>();
    for (const tx of credits) {
      const category = await this.classifier.categorizeWithCache(
        tx.description ?? '',
        customerId,
      );
      const existing = grouped.get(category);
      const amt = new Decimal(tx.amount.toString());
      if (existing)
        grouped.set(category, {
          amount: existing.amount.plus(amt),
          count: existing.count + 1,
        });
      else grouped.set(category, { amount: amt, count: 1 });
    }

    let total = new Decimal(0);
    for (const { amount } of grouped.values()) total = total.plus(amount);

    const sources: RevenueSource[] = [];
    let dominant = '';
    let maxAmt = new Decimal(0);

    for (const [category, { amount, count }] of grouped.entries()) {
      const pct = total.gt(0) ? amount.div(total).times(100).toNumber() : 0;
      sources.push({
        category,
        amount: amount.toNumber(),
        percent: Math.round(pct * 10) / 10,
        count,
      });
      if (amount.gt(maxAmt)) {
        maxAmt = amount;
        dominant = category;
      }
    }

    return {
      source: sources.sort((a, b) => b.amount - a.amount),
      totalAmount: total.toNumber(),
      dominantSource: dominant,
    };
  }

  async computeRevenueVariation(
    transactions: Transaction[],
    customerId: string,
    months: number = 6,
    year?: number,
    month?: number,
  ): Promise<RevenueVariation> {
    const now = new Date();
    const refYear = year ?? now.getUTCFullYear();
    const refMonth = month ?? now.getUTCMonth() + 1;
    const analysisDate = new Date(
      Date.UTC(refYear, refMonth, 0, 23, 59, 59, 999),
    );

    const monthKeys: string[] = [];
    for (let i = 0; i < months; i++) {
      monthKeys.push(
        new Date(Date.UTC(refYear, refMonth - i, 0)).toISOString().slice(0, 7),
      );
    }
    monthKeys.reverse();

    const revenueByMonth = new Map<string, Decimal>();
    for (const key of monthKeys) revenueByMonth.set(key, new Decimal(0));

    const periodStart = new Date(Date.UTC(refYear, refMonth - months, 1));
    const periodTxs = filterTransactions(transactions, {
      customerId,
      type: 'CREDIT',
      from: periodStart,
      to: analysisDate,
    });

    for (const tx of periodTxs) {
      const key = tx.transactionDate.toISOString().slice(0, 7);
      if (revenueByMonth.has(key))
        revenueByMonth.set(
          key,
          revenueByMonth.get(key)!.plus(new Decimal(tx.amount.toString())),
        );
    }

    const monthlyRevenues: MonthlyRevenue[] = monthKeys.map((key, i) => {
      const amount = revenueByMonth.get(key)!.toNumber();
      let variation: number | null = null;
      if (i > 0) {
        const prev = revenueByMonth.get(monthKeys[i - 1])!.toNumber();
        variation =
          prev > 0
            ? Math.round(((amount - prev) / prev) * 1000) / 10
            : amount > 0
              ? 100
              : 0;
      }
      return { month: key, amount, variationPercent: variation };
    });

    const vars = monthlyRevenues
      .filter((m) => m.variationPercent !== null)
      .map((m) => m.variationPercent!);
    const avgVar =
      vars.length > 0
        ? Math.round((vars.reduce((a, b) => a + b, 0) / vars.length) * 10) / 10
        : 0;
    const amts = monthlyRevenues.map((m) => m.amount);
    const mean = amts.reduce((a, b) => a + b, 0) / amts.length;
    const stdDev = Math.round(
      Math.sqrt(
        amts.map((a) => Math.pow(a - mean, 2)).reduce((a, b) => a + b, 0) /
          amts.length,
      ),
    );
    const cv = mean > 0 ? Math.round((stdDev / mean) * 1000) / 10 : 0;

    return {
      monthlyRevenues,
      averageVariationPercent: avgVar,
      stdDev,
      coefficientOfVariation: cv,
      trend: avgVar > 5 ? 'UP' : avgVar < -5 ? 'DOWN' : 'STABLE',
      volatilityScore: cv < 10 ? 100 : cv < 25 ? 70 : cv < 50 ? 35 : 0,
    };
  }
}
