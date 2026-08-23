import { Injectable } from '@nestjs/common';
import {
  DailyBalance,
  AverageBalanceResponse,
  BalanceExtremesResponse,
  OverdraftAnalyticsResponse,
  NegativePeriodsResponse,
  NegativePeriod,
  BalanceVolatilityResponse,
  Entry,
} from '../types';
import Decimal from 'decimal.js';
import { filterEntries } from '../helper';

@Injectable()
export class BalanceEngine {
  /**
   * Reconstruit le solde quotidien à partir des ÉCRITURES (Entries).
   */
  async reconstructMonthlyDailyBalances(
    entries: Entry[],
    customerId: string,
    initialBalance: Decimal,
    year: number,
    month: number,
  ): Promise<DailyBalance[]> {
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0));
    const totalDays = lastDayOfMonth.getUTCDate();

    const dailyBalances: DailyBalance[] = [];
    let currentBalance = initialBalance;

    // 1. Filtrer les écritures du mois
    const monthEntries = filterEntries(entries, {
      year,
      month,
      includeMobileMoney: true,
      excludeSelfTransfers: true,
    }).sort(
      (a, b) =>
        new Date(a.transaction.transactionDate).getTime() -
        new Date(b.transaction.transactionDate).getTime(),
    );

    // 2. Grouper par jour
    const entriesByDay = new Map<number, Entry[]>();
    for (const entry of monthEntries) {
      const day = new Date(entry.transaction.transactionDate).getUTCDate();
      const list = entriesByDay.get(day) || [];
      list.push(entry);
      entriesByDay.set(day, list);
    }

    // 3. Parcourir chaque jour
    for (let day = 1; day <= totalDays; day++) {
      const dayEntries = entriesByDay.get(day) || [];

      for (const entry of dayEntries) {
        const amount = new Decimal(entry.amount.toString());
        if (entry.direction === 'DEBIT') {
          currentBalance = currentBalance.minus(amount);
        } else if (entry.direction === 'CREDIT') {
          currentBalance = currentBalance.plus(amount);
        }
      }

      dailyBalances.push({
        date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        balance: currentBalance.toNumber(),
      });
    }

    return dailyBalances;
  }

  async calculateAverageBalance(
    dailyBalances: DailyBalance[],
    year: number,
    month: number,
  ): Promise<AverageBalanceResponse> {
    const sum = dailyBalances.reduce(
      (acc, curr) => acc.plus(curr.balance),
      new Decimal(0),
    );
    return {
      month: `${year}-${month.toString().padStart(2, '0')}`,
      averageBalance:
        dailyBalances.length > 0
          ? sum.div(dailyBalances.length).toDP(0).toNumber()
          : 0,
      dailyBalances,
    };
  }

  async calculateExtremes(
    dailyBalances: DailyBalance[],
  ): Promise<BalanceExtremesResponse> {
    if (dailyBalances.length === 0)
      return {
        minimum: { amount: 0, date: '' },
        maximum: { amount: 0, date: '' },
        range: 0,
      };
    let min = dailyBalances[0],
      max = dailyBalances[0];
    for (const curr of dailyBalances) {
      if (curr.balance < min.balance) min = curr;
      if (curr.balance > max.balance) max = curr;
    }
    return {
      minimum: { amount: min.balance, date: min.date },
      maximum: { amount: max.balance, date: max.date },
      range: new Decimal(max.balance).minus(min.balance).toNumber(),
    };
  }

  async calculateOverdraftFrequency(
    dailyBalances: DailyBalance[],
  ): Promise<OverdraftAnalyticsResponse> {
    const overdraftDays = dailyBalances.filter((d) => d.balance < 0);
    const rate =
      dailyBalances.length > 0
        ? (overdraftDays.length / dailyBalances.length) * 100
        : 0;
    const score =
      rate === 0
        ? 100
        : rate <= 5
          ? 85
          : rate <= 15
            ? 70
            : rate <= 30
              ? 40
              : 10;
    return {
      overdraftDays: overdraftDays.length,
      totalDays: dailyBalances.length,
      overdraftRate: Math.round(rate * 10) / 10,
      overdraftLabel:
        rate === 0
          ? 'EXCELLENT'
          : rate <= 5
            ? 'SAIN'
            : rate <= 15
              ? 'ATTENTION'
              : rate <= 30
                ? 'PRUDENCE'
                : 'CRITIQUE',
      score,
      overdraftDates: overdraftDays.map((d) => d.date),
    };
  }

  async calculateNegativePeriods(
    dailyBalances: DailyBalance[],
  ): Promise<NegativePeriodsResponse> {
    const negativePeriods: NegativePeriod[] = [];
    let current: Partial<NegativePeriod> | null = null;

    for (const d of dailyBalances) {
      if (d.balance < 0) {
        if (!current)
          current = { from: d.date, durationDays: 1, minBalance: d.balance };
        else {
          current.durationDays!++;
          if (d.balance < current.minBalance!) current.minBalance = d.balance;
        }
        current.to = d.date;
      } else if (current) {
        negativePeriods.push(current as NegativePeriod);
        current = null;
      }
    }
    if (current) negativePeriods.push(current as NegativePeriod);

    const total = negativePeriods.reduce((acc, p) => acc + p.durationDays, 0);
    const longest =
      negativePeriods.length > 0
        ? negativePeriods.reduce((a, b) =>
            b.durationDays > a.durationDays ? b : a,
          )
        : null;

    return {
      negativePeriods,
      totalNegativeDays: total,
      averageDuration:
        negativePeriods.length > 0
          ? Math.round((total / negativePeriods.length) * 10) / 10
          : 0,
      maxDuration:
        negativePeriods.length > 0
          ? Math.max(...negativePeriods.map((p) => p.durationDays))
          : 0,
      longestPeriod: longest ? { from: longest.from, to: longest.to } : null,
    };
  }

  async calculateVolatility(
    dailyBalances: DailyBalance[],
    averageBalance: number,
  ): Promise<BalanceVolatilityResponse> {
    if (dailyBalances.length === 0)
      return {
        averageBalance: 0,
        stdDev: 0,
        coefficientOfVariation: 0,
        volatilityLabel: 'STABLE',
        score: 100,
      };
    const avg = new Decimal(averageBalance);
    const variance = dailyBalances
      .map((d) => new Decimal(d.balance).minus(avg).pow(2))
      .reduce((a, b) => a.plus(b), new Decimal(0))
      .div(dailyBalances.length);
    const stdDev = variance.sqrt().toDP(0).toNumber();
    const cv =
      averageBalance !== 0
        ? new Decimal(stdDev)
            .div(Math.abs(averageBalance))
            .times(100)
            .toDP(1)
            .toNumber()
        : 0;
    const score =
      cv <= 10 ? 100 : cv <= 25 ? 80 : cv <= 50 ? 60 : cv <= 80 ? 35 : 15;
    return {
      averageBalance,
      stdDev,
      coefficientOfVariation: cv,
      score,
      volatilityLabel:
        cv <= 10
          ? 'TRES STABLE'
          : cv <= 25
            ? 'STABLE'
            : cv <= 50
              ? 'MODERE'
              : cv <= 80
                ? 'INSTABLE'
                : 'TRES INSTABLE',
    };
  }
}
