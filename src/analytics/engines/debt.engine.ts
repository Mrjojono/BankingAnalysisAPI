import {
  Debt,
  Transaction,
  TotalDebtAnalytics,
  MonthlyPaymentsAnalytics,
  RepaymentHistoryAnalytics,
  DebtRatioAnalytics,
  RepaymentHistoryItem,
} from '../types';
import Decimal from 'decimal.js';
import { Classifier } from '../shared/classifier';
import { filterTransactions } from '../helper';
import { Injectable } from '@nestjs/common';

/**
 * Moteur d'analyse des dettes .
 */
@Injectable()
export class DebtEngine {
  constructor(private classifier: Classifier) {}

  /**
   * Détection des dettes
   * Analyse les transactions pour identifier les remboursements de crédits récurrents.
   */
  async detectDebts(
    transactions: Transaction[],
    customerId: string,
    year?: number,
    month?: number,
    from?: Date,
    to?: Date,
  ): Promise<Debt> {
    //  On s'appuie sur la détection des dépenses récurrentes
    // Dans un contexte de dette, on cherche spécifiquement les catégories 'CREDIT' ou les descriptions liées
    const MIN_OCCURRENCES = 2;
    const AMOUNT_VARIATION_THRESHOLD = 0.1; // < 10%
    const DAYS_INTERVAL_MIN = 25;
    const DAYS_INTERVAL_MAX = 35;

    const debits = filterTransactions(transactions, {
      customerId,
      type: 'DEBIT',
      year,
      month,
      from,
      to,
    });

    const groupedByDescription = new Map<string, Transaction[]>();
    for (const tx of debits) {
      if (tx.description) {
        const normalizedDesc = tx.description.toLowerCase().trim();
        const group = groupedByDescription.get(normalizedDesc) || [];
        group.push(tx);
        groupedByDescription.set(normalizedDesc, group);
      }
    }

    const detectedCredits: Debt['detectedCredits'] = [];

    for (const [desc, group] of groupedByDescription.entries()) {
      if (group.length < MIN_OCCURRENCES) continue;

      // Utilisation du Classifier injecté pour vérifier si c'est une dette (avec cache Redis)
      // Le Classifier s'appuie sur les EXPENSE_KEYWORDS enrichis
      if (!(await this.classifier.isDebt(desc, customerId))) continue;

      group.sort(
        (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime(),
      );

      let isStable = true;
      let totalAmount = new Decimal(0);

      for (let i = 1; i < group.length; i++) {
        const prev = group[i - 1];
        const current = group[i];

        // Vérification de l'intervalle
        const days =
          (current.transactionDate.getTime() - prev.transactionDate.getTime()) /
          (1000 * 3600 * 24);
        if (days < DAYS_INTERVAL_MIN || days > DAYS_INTERVAL_MAX) {
          isStable = false;
          break;
        }

        // Vérification du montant
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
          (tx) =>
            (totalAmount = totalAmount.plus(new Decimal(tx.amount.toString()))),
        );
        const avgAmount = totalAmount.div(group.length).toDP(0).toNumber();

        detectedCredits.push({
          description: group[0].description!,
          monthlyAmount: avgAmount,
          firstDetected: group[0].transactionDate.toISOString().split('T')[0],
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
    transactions: Transaction[],
    customerId: string,
  ): Promise<TotalDebtAnalytics> {
    const { detectedCredits } = await this.detectDebts(
      transactions,
      customerId,
    );

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
    transactions: Transaction[],
    customerId: string,
  ): Promise<MonthlyPaymentsAnalytics> {
    const { detectedCredits, totalMonthlyDebt } = await this.detectDebts(
      transactions,
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
    const bceaoThreshold = 33;
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
    } else if (debtRatio <= 33) {
      label = 'SAIN';
      score = 80;
      interpretation = 'Vous etes en dessous du seuil BCEAO de 33%.';
    } else if (debtRatio <= 45) {
      label = 'ATTENTION';
      score = 40;
      interpretation = 'Vous depassez le seuil recommande de 33%.';
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
    transactions: Transaction[],
    customerId: string,
    months: number = 6,
  ): Promise<RepaymentHistoryAnalytics> {
    const debits = filterTransactions(transactions, {
      customerId,
      type: 'DEBIT',
    });

    // On cherche les remboursements de credit (via Classifier)
    const creditTxs: Transaction[] = [];
    for (const tx of debits) {
      if (await this.classifier.isDebt(tx.description ?? '', customerId)) {
        creditTxs.push(tx);
      }
    }

    const history: RepaymentHistoryItem[] = [];
    let paymentsOnTime = 0;
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const monthStr = targetDate.toISOString().slice(0, 7);

      const monthTx = creditTxs.find(
        (tx) => tx.transactionDate.toISOString().slice(0, 7) === monthStr,
      );

      if (monthTx) {
        // Simulation du "jour attendu" : on suppose le 5 du mois
        const day = monthTx.transactionDate.getUTCDate();
        const diff = Math.abs(day - 5);
        const onTime = diff <= 5;
        if (onTime) paymentsOnTime++;

        history.push({
          month: monthStr,
          paid: true,
          daysFromExpected: day - 5,
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
}
