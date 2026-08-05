import Decimal from 'decimal.js';
import { filterEntries } from '../helper';
import {
  RevenueAnalytics,
  CashFlowAnalytics,
  MonthlySummary,
  IncomeFrequency,
  RevenueSources,
  RevenueSource,
  MonthlyRevenue,
  RevenueVariation,
  Period,
  Entry,
} from '../types';
import { Classifier } from '../shared/classifier';
import { Injectable } from '@nestjs/common';
import { NON_EXPENSE_CATEGORIES } from '../config/expense-keywords';

@Injectable()
export class RevenueEngine {
  constructor(private classifier: Classifier) {}

  /**
   * Construit un résumé financier basé sur les écritures comptables (Entries).
   */
  async buildFinancialSummary(
    entries: Entry[],
    customerId: string,
    period: Period,
  ): Promise<CashFlowAnalytics> {
    const periodEntries = filterEntries(entries, {
      direction: 'CREDIT',
      accountType: 'CHECKING',
      excludeSelfTransfers: true,
      from: period.from,
      to: period.to,
    });

    let creditCount = 0;
    let debitCount = 0;
    let creditAmount = new Decimal(0);
    let debitAmount = new Decimal(0);

    for (const entry of periodEntries) {
      const amount = new Decimal(entry.amount.toString());
      creditCount++;
      creditAmount = creditAmount.plus(amount);
    }

    const debitEntries = filterEntries(entries, {
      direction: 'DEBIT',
      accountType: 'CHECKING',
      excludeSelfTransfers: true,
      from: period.from,
      to: period.to,
    });

    for (const entry of debitEntries) {
      const category = await this.classifier.categorizeWithCache(
        entry.transaction.description ?? '',
        customerId,
      );

      if (NON_EXPENSE_CATEGORIES.has(category as any)) continue;

      const amount = new Decimal(entry.amount.toString());
      debitCount++;
      debitAmount = debitAmount.plus(amount);
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
   * Calcule les indicateurs de revenu basés sur les CREDIT entries.
   */
  async computeRevenueAnalytics(
    entries: Entry[],
    customerId: string,
    year?: number,
    month?: number,
  ): Promise<RevenueAnalytics> {
    return this.monthlySummaryIncome(entries, customerId, year, month);
  }

  /**
   * Résumé mensuel basé sur les CREDIT entries sur les comptes CHECKING.
   */
  async monthlySummaryIncome(
    entries: Entry[],
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

    // 1. Revenus réels (CREDIT sur CHECKING)
    const targetMonthCredits = filterEntries(entries, {
      direction: 'CREDIT',
      accountType: 'CHECKING',
      excludeSelfTransfers: true,
      year: refYear,
      month: refMonth,
    });

    // 2. Mois précédent
    const prevDate = new Date(Date.UTC(refYear, refMonth - 1, 0));
    const previousMonthCredits = filterEntries(entries, {
      direction: 'CREDIT',
      accountType: 'CHECKING',
      excludeSelfTransfers: true,
      year: prevDate.getUTCFullYear(),
      month: prevDate.getUTCMonth() + 1,
    });

    // 3. Moyenne des 6 derniers mois
    const creditsByMonth = new Map<string, Decimal>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(Date.UTC(refYear, refMonth - i, 0));
      creditsByMonth.set(d.toISOString().slice(0, 7), new Decimal(0));
    }

    const sixMonthsStart = new Date(Date.UTC(refYear, refMonth - 6, 1));
    const sixMonthsCredits = filterEntries(entries, {
      direction: 'CREDIT',
      accountType: 'CHECKING',
      excludeSelfTransfers: true,
      from: sixMonthsStart,
      to: analysisDate,
    });

    for (const entry of sixMonthsCredits) {
      const key = new Date(entry.transaction.transactionDate)
        .toISOString()
        .slice(0, 7);
      if (creditsByMonth.has(key)) {
        creditsByMonth.set(
          key,
          creditsByMonth.get(key)!.plus(new Decimal(entry.amount.toString())),
        );
      }
    }

    const currentTotal = targetMonthCredits.reduce(
      (s, e) => s.plus(new Decimal(e.amount.toString())),
      new Decimal(0),
    );
    const previousTotal = previousMonthCredits.reduce(
      (s, e) => s.plus(new Decimal(e.amount.toString())),
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
      rolling30Days: (() => {
        const rollingStart = new Date(analysisDate.getTime() - 30 * 86400000);
        const rollingCredits = filterEntries(entries, {
          direction: 'CREDIT',
          accountType: 'CHECKING',
          excludeSelfTransfers: true,
          from: rollingStart,
          to: analysisDate,
        });
        return rollingCredits
          .reduce(
            (s, e) => s.plus(new Decimal(e.amount.toString())),
            new Decimal(0),
          )
          .toNumber();
      })(),
    };
  }

  async computeIncomeFrequency(
    entries: Entry[],
    customerId: string,
    year?: number,
    month?: number,
    months: number = 6,
  ): Promise<IncomeFrequency> {
    const now = new Date();
    const refYear = year ?? now.getUTCFullYear();
    const refMonth = month ?? now.getUTCMonth() + 1;
    const analysisDate = new Date(
      Date.UTC(refYear, refMonth, 0, 23, 59, 59, 999),
    );
    const cutoff = new Date(Date.UTC(refYear, refMonth - months, 1));

    const credits = filterEntries(entries, {
      direction: 'CREDIT',
      accountType: 'CHECKING',
      excludeSelfTransfers: true,
      from: cutoff,
      to: analysisDate,
    }).sort(
      (a, b) =>
        new Date(a.transaction.transactionDate).getTime() -
        new Date(b.transaction.transactionDate).getTime(),
    );

    const entriesPerMonth = credits.length;
    const weeks = months * 4.33;
    const entriesPerWeek = Math.round((credits.length / weeks) * 100) / 100;

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
        (new Date(credits[i].transaction.transactionDate).getTime() -
          new Date(credits[i - 1].transaction.transactionDate).getTime()) /
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
    entries: Entry[],
    customerId: string,
    from: Date,
    to: Date,
  ): Promise<RevenueSources> {
    const credits = filterEntries(entries, {
      direction: 'CREDIT',
      accountType: 'CHECKING',
      excludeSelfTransfers: true,
      from,
      to,
    });

    const grouped = new Map<string, { amount: Decimal; count: number }>();
    for (const entry of credits) {
      const category = await this.classifier.categorizeWithCache(
        entry.transaction.description ?? '',
        customerId,
      );
      const existing = grouped.get(category);
      const amt = new Decimal(entry.amount.toString());
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
    entries: Entry[],
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

    // 1. Définir les clés de mois (ISO YYYY-MM)
    const monthKeys: string[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(Date.UTC(refYear, refMonth - 1 - i, 1));
      monthKeys.push(d.toISOString().slice(0, 7));
    }
    monthKeys.reverse();

    // 2. Initialiser les revenus par mois
    const revenueByMonth = new Map<string, Decimal>();
    for (const key of monthKeys) revenueByMonth.set(key, new Decimal(0));

    // 3. Filtrer les écritures sur la période globale
    const periodStart = new Date(Date.UTC(refYear, refMonth - 1 - months, 1));
    const periodEntries = filterEntries(entries, {
      direction: 'CREDIT',
      accountType: 'CHECKING',
      excludeSelfTransfers: true,
      from: periodStart,
      to: analysisDate,
    });

    // 4. Ventiler par mois
    for (const entry of periodEntries) {
      const key = new Date(entry.transaction.transactionDate)
        .toISOString()
        .slice(0, 7);
      if (revenueByMonth.has(key)) {
        revenueByMonth.set(
          key,
          revenueByMonth.get(key)!.plus(new Decimal(entry.amount.toString())),
        );
      }
    }

    // 5. Calculer les variations
    const monthlyRevenues: MonthlyRevenue[] = monthKeys.map((key, i) => {
      const amount = revenueByMonth.get(key)!.toNumber();
      let variation: number | null = null;

      if (i > 0) {
        const prevAmount = revenueByMonth.get(monthKeys[i - 1])!.toNumber();
        if (prevAmount > 0) {
          variation =
            Math.round(((amount - prevAmount) / prevAmount) * 1000) / 10;
        } else if (amount > 0) {
          variation = 100;
        } else {
          variation = 0;
        }
      }
      return { month: key, amount, variationPercent: variation };
    });

    // 6. Statistiques globales
    const variations = monthlyRevenues
      .filter((m) => m.variationPercent !== null)
      .map((m) => m.variationPercent as number);

    const avgVariation =
      variations.length > 0
        ? Math.round(
            (variations.reduce((a, b) => a + b, 0) / variations.length) * 10,
          ) / 10
        : 0;

    const amounts = monthlyRevenues.map((m) => m.amount);
    const meanAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    const variance =
      amounts
        .map((a) => Math.pow(a - meanAmount, 2))
        .reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.round(Math.sqrt(variance));
    const cv =
      meanAmount > 0 ? Math.round((stdDev / meanAmount) * 1000) / 10 : 0;

    return {
      monthlyRevenues,
      averageVariationPercent: avgVariation,
      stdDev,
      coefficientOfVariation: cv,
      trend: avgVariation > 5 ? 'UP' : avgVariation < -5 ? 'DOWN' : 'STABLE',
      volatilityScore: cv < 10 ? 100 : cv < 25 ? 70 : cv < 50 ? 35 : 0,
    };
  }
}
