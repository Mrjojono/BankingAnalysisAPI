import {
  Debt,
  Entry,
  TotalDebtAnalytics,
  MonthlyPaymentsAnalytics,
  RepaymentHistoryAnalytics,
  DebtRatioAnalytics,
  RepaymentHistoryItem,
} from '../types';
import Decimal from 'decimal.js';
import { filterEntries, normalizeDescription } from '../helper';
import { DebtDetector } from '../detectors/debt-detector';
import { Injectable } from '@nestjs/common';

import { ANALYTICS_CONSTANTS } from '../config/constants';

/**
 * Moteur d'analyse des dettes .
 */
@Injectable()
export class DebtEngine {
  constructor(private debtDetector: DebtDetector) {}

  /**
   * Détection des dettes
   * Analyse les entrées comptables pour identifier les remboursements de crédits récurrents.
   */
  async detectDebts(
    entries: Entry[],
    customerId: string,
    year?: number,
    month?: number,
    from?: Date,
    to?: Date,
  ): Promise<Debt> {
    const MIN_OCCURRENCES = ANALYTICS_CONSTANTS.MIN_RECURRING_OCCURRENCES;
    const AMOUNT_VARIATION_THRESHOLD =
      ANALYTICS_CONSTANTS.AMOUNT_VARIATION_THRESHOLD;
    const DAYS_INTERVAL_MIN = ANALYTICS_CONSTANTS.DAYS_INTERVAL_MIN;
    const DAYS_INTERVAL_MAX = ANALYTICS_CONSTANTS.DAYS_INTERVAL_MAX;

    const debits = filterEntries(entries, {
      direction: 'DEBIT',
      accountType: 'CHECKING',
      includeMobileMoney: true,
      excludeSelfTransfers: true,
      year,
      month,
      from,
      to,
    });

    const groupedByDescription = new Map<string, Entry[]>();
    for (const entry of debits) {
      const desc = entry.transaction.description;
      if (desc) {
        const normalizedDesc = normalizeDescription(desc);
        const group = groupedByDescription.get(normalizedDesc) || [];
        group.push(entry);
        groupedByDescription.set(normalizedDesc, group);
      }
    }

    const detectedCredits: Debt['detectedCredits'] = [];

    for (const [desc, group] of groupedByDescription.entries()) {
      if (group.length < MIN_OCCURRENCES) continue;

      const groupAvg = group.reduce(
        (sum, e) => sum + Number(e.amount),
        0,
      ) / group.length;
      const assessment = await this.debtDetector.assessDebtPayment(
        desc,
        groupAvg,
        customerId,
      );
      if (!assessment.isDebt) continue;

      group.sort(
        (a, b) =>
          new Date(a.transaction.transactionDate).getTime() -
          new Date(b.transaction.transactionDate).getTime(),
      );

      let isStable = true;
      let totalAmount = new Decimal(0);

      for (let i = 1; i < group.length; i++) {
        const prev = group[i - 1];
        const current = group[i];

        const prevDate = new Date(prev.transaction.transactionDate);
        const currDate = new Date(current.transaction.transactionDate);
        const days =
          (currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);
        if (days < DAYS_INTERVAL_MIN || days > DAYS_INTERVAL_MAX) {
          isStable = false;
          break;
        }

        const amtPrev = new Decimal(prev.amount.toString());
        const amtCurr = new Decimal(current.amount.toString());
        const variation = amtPrev.minus(amtCurr).abs().div(amtPrev);
        if (variation.gt(AMOUNT_VARIATION_THRESHOLD)) {
          isStable = false;
          break;
        }
      }

      if (isStable) {
        group.forEach(
          (entry) =>
            (totalAmount = totalAmount.plus(
              new Decimal(entry.amount.toString()),
            )),
        );
        const avgAmount = totalAmount.div(group.length).toDP(0).toNumber();

        detectedCredits.push({
          description: group[0].transaction.description!,
          monthlyAmount: avgAmount,
          firstDetected: new Date(group[0].transaction.transactionDate)
            .toISOString()
            .split('T')[0],
          occurences: group.length,
          confidence: group.length > 3 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    return {
      detectedCredits,
      totalMonthlyDebt: detectedCredits.reduce(
        (sum, d) => sum + d.monthlyAmount,
        0,
      ),
    };
  }

  /**
   * Montant total des dettes
   * Estime la dette restante basee sur la duree typique des prets bancaires.
   */
  async calculateTotalDebt(
    entries: Entry[],
    customerId: string,
  ): Promise<TotalDebtAnalytics> {
    const { detectedCredits } = await this.detectDebts(entries, customerId);

    const debts = detectedCredits.map((credit) => {
      // Strategie d'estimation : on suppose une duree de 24 mois si peu d'occurrences,
      // sinon on extrapole. Pour un projet academique, on peut simuler une echeance.
      const estimatedRemainingMonths = credit.occurences > 6 ? 12 : 24;
      const estimatedRemainingDebt =
        credit.monthlyAmount * estimatedRemainingMonths;

      return {
        description: credit.description,
        monthlyAmount: credit.monthlyAmount,
        estimatedRemainingMonths,
        estimatedRemainingDebt,
      };
    });

    return {
      debts,
      totalEstimatedDebt: debts.reduce(
        (sum, d) => sum + d.estimatedRemainingDebt,
        0,
      ),
      totalMonthlyCommitments: debts.reduce(
        (sum, d) => sum + d.monthlyAmount,
        0,
      ),
    };
  }

  /**
   * Mensualites
   * Repartition des remboursements.
   */
  async calculateMonthlyPayments(
    entries: Entry[],
    customerId: string,
  ): Promise<MonthlyPaymentsAnalytics> {
    const { detectedCredits, totalMonthlyDebt } = await this.detectDebts(
      entries,
      customerId,
    );

    const breakdown = detectedCredits.map((credit) => ({
      description: credit.description,
      amount: credit.monthlyAmount,
      percent:
        totalMonthlyDebt > 0
          ? new Decimal(credit.monthlyAmount)
              .div(totalMonthlyDebt)
              .times(100)
              .toDP(1)
              .toNumber()
          : 0,
    }));

    return {
      totalMonthlyPayments: totalMonthlyDebt,
      breakdown,
    };
  }

  /**
   * Taux d'endettement
   * Compare les dettes aux revenus .
   * Le seuil est fixe à 33% selon la norme BCEAO.
   * @param monthlyIncome Revenu mensuel
   * @param monthlyDebtPayments Paiements mensuels de dettes
   * @returns Analyse du taux d'endettement
   */
  async calculateDebtRatio(
    monthlyIncome: number,
    monthlyDebtPayments: number,
  ): Promise<DebtRatioAnalytics> {
    const bceaoThreshold = ANALYTICS_CONSTANTS.BCEAO_DEBT_RATIO_THRESHOLD;
    const debtRatio =
      monthlyIncome > 0
        ? new Decimal(monthlyDebtPayments)
            .div(monthlyIncome)
            .times(100)
            .toDP(1)
            .toNumber()
        : 0;

    let label: string;
    let score: number;
    let interpretation: string;

    if (debtRatio <= 15) {
      label = 'EXCELLENT';
      score = 100;
      interpretation = "Votre taux d'endettement est tres faible.";
    } else if (debtRatio <= bceaoThreshold) {
      label = 'SAIN';
      score = 80;
      interpretation = `Vous etes en dessous du seuil BCEAO de ${bceaoThreshold}%.`;
    } else if (debtRatio <= 45) {
      label = 'ATTENTION';
      score = 40;
      interpretation = `Vous depassez le seuil recommande de ${bceaoThreshold}%.`;
    } else {
      label = 'CRITIQUE';
      score = 10;
      interpretation = 'Surendettement detecte. Danger financier.';
    }

    return {
      monthlyIncome,
      monthlyDebtPayments,
      debtRatio,
      bceaoThreshold,
      label,
      score,
      margin: Math.max(0, bceaoThreshold - debtRatio),
      interpretation,
    };
  }

  /**
   * Historique de remboursement
   * Verifie la ponctualite sur les 6 derniers mois.
   * on suppose le jour du remboursement sur le 5 du moi
   *
   * @param transactions Liste des transactions
   * @param customerId ID du client
   * @param months Nombre de mois à analyser (par défaut 6)
   * @returns Analyse de l'historique de remboursement
   */
  async calculateRepaymentHistory(
    entries: Entry[],
    customerId: string,
    months: number = 6,
  ): Promise<RepaymentHistoryAnalytics> {
    const debits = filterEntries(entries, {
      direction: 'DEBIT',
      accountType: 'CHECKING',
      includeMobileMoney: true,
      excludeSelfTransfers: true,
    });

    const creditEntries: Entry[] = [];
    for (const entry of debits) {
      const assessment = await this.debtDetector.assessDebtPayment(
        entry.transaction.description ?? '',
        Number(entry.amount),
        customerId,
      );
      if (assessment.isDebt) {
        creditEntries.push(entry);
      }
    }

    const history: RepaymentHistoryItem[] = [];
    const now = new Date();

    // Collecter les jours de paiement réels pour chaque mois
    const monthEntries: { month: string; entry?: Entry }[] = [];
    for (let i = 0; i < months; i++) {
      const targetDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const monthStr = targetDate.toISOString().slice(0, 7);

      const monthEntry = creditEntries.find(
        (entry) =>
          new Date(entry.transaction.transactionDate)
            .toISOString()
            .slice(0, 7) === monthStr,
      );
      monthEntries.push({ month: monthStr, entry: monthEntry });
    }

    // Calculer le jour médian comme échéance attendue (≥ 3 paiements nécessaires)
    const paymentDays = monthEntries
      .filter((m): m is { month: string; entry: Entry } => !!m.entry)
      .map((m) => new Date(m.entry.transaction.transactionDate).getUTCDate())
      .sort((a, b) => a - b);

    const expectedDay =
      paymentDays.length >= 3
        ? paymentDays[Math.floor(paymentDays.length / 2)]
        : 5; // fallback par défaut si pas assez de données

    let paymentsOnTime = 0;
    for (const { month: monthStr, entry: monthEntry } of monthEntries) {
      if (monthEntry) {
        const txDate = new Date(monthEntry.transaction.transactionDate);
        const day = txDate.getUTCDate();
        const diff = Math.abs(day - expectedDay);
        const onTime = diff <= 5;
        if (onTime) paymentsOnTime++;

        history.push({
          month: monthStr,
          paid: true,
          daysFromExpected: day - expectedDay,
        });
      } else {
        history.push({
          month: monthStr,
          paid: false,
          daysFromExpected: 0,
        });
      }
    }

    const regularityRate = Math.round((paymentsOnTime / months) * 100);

    return {
      monthsAnalyzed: months,
      paymentsOnTime,
      regularityRate,
      score: regularityRate,
      history: history.reverse(),
    };
  }

  /**
   * Calcule le score d'utilisation du crédit (creditUtilizationScore)
   * à partir du debt ratio. Fonction partagée pour éviter la duplication.
   */
  computeCreditUtilizationScore(debtRatio: number): number {
    if (debtRatio === 0) return 100;
    if (debtRatio <= 15) return 80;
    if (debtRatio <= ANALYTICS_CONSTANTS.BCEAO_DEBT_RATIO_THRESHOLD) return 60;
    if (debtRatio <= 45) return 30;
    return 10;
  }
}
