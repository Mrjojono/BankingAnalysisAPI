import { Injectable } from '@nestjs/common';
import {
  Expense,
  Transaction,
  CategoryExpense,
  RecurringExpense,
  VariableExpenseAnalytics,
  ExpenseRatioAnalytics,
} from '../types';
import Decimal from 'decimal.js';
import { Classifier } from '../shared/classifier';
import { filterTransactions } from '../helper';

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
   * US-02.1 — Detection des depenses
   * Filtre toutes les transactions DEBIT et les somme par periode.
   */
  async getExpenses(
    transactions: Transaction[],
    customerId: string,
    year?: number,
    month?: number,
    from?: Date,
    to?: Date,
  ): Promise<Expense> {
    // 1. Filtrer les transactions de type DEBIT pour le client et la periode donnee
    const debits = filterTransactions(transactions, {
      customerId,
      type: 'DEBIT',
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
    let largestExpense: Transaction | null = null;

    // 2. Sommer les montants et identifier la plus grosse depense
    for (const tx of debits) {
      const amount = new Decimal(tx.amount.toString());
      totalDebitAmount = totalDebitAmount.plus(amount);

      if (
        !largestExpense ||
        amount.greaterThan(new Decimal(largestExpense.amount.toString()))
      ) {
        largestExpense = tx;
      }
    }

    // 3. Retourner les metriques de synthese
    return {
      totalExpenses: totalDebitAmount.toNumber(),
      count: debits.length,
      averageTransactionAmount: totalDebitAmount
        .div(debits.length)
        .toDP(0)
        .toNumber(),
      largestExpense: {
        amount: new Decimal(largestExpense!.amount.toString()).toNumber(),
        description: largestExpense!.description ?? '',
        date: largestExpense!.transactionDate.toISOString().split('T')[0],
      },
    };
  }

  /**
   * US-02.2 — Categories de depenses
   * Analyse la description de chaque DEBIT, classifie par mots-cles et somme par categorie.
   */
  async getCategoryExpenses(
    transactions: Transaction[],
    customerId: string,
    year?: number,
    month?: number,
    from?: Date,
    to?: Date,
  ): Promise<CategoryExpense> {
    // 1. Filtrer les transactions DEBIT
    const debits = filterTransactions(transactions, {
      customerId,
      type: 'DEBIT',
      year,
      month,
      from,
      to,
    });

    const grouped = new Map<string, { amount: Decimal; count: number }>();

    // 2. Classifier chaque transaction et grouper par categorie (avec cache Redis)
    for (const tx of debits) {
      const category = await this.classifier.categorizeWithCache(
        tx.description ?? '',
        customerId,
      );
      const amount = new Decimal(tx.amount.toString());
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

    // 3. Calculer le total global pour le calcul des pourcentages
    let totalAmount = new Decimal(0);
    for (const { amount } of grouped.values()) {
      totalAmount = totalAmount.plus(amount);
    }

    // 4. Formater les resultats par categorie avec le % du total
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

    // Trier par montant decroissant
    categories.sort((a, b) => b.amount - a.amount);

    return {
      categories,
      totalExpenses: totalAmount.toNumber(),
    };
  }

  /**
   * Normalise la description pour le groupage des depenses recurrentes.
   */
  private normalizeDescription(desc: string): string {
    return desc
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * US-02.3 — Depenses recurrentes
   * Detecte les depenses qui apparaissent regulierement (intervalle ~30j, montants similaires).
   */
  async detectRecurringExpenses(
    transactions: Transaction[],
    customerId: string,
    months: number = 3,
    year?: number,
    month?: number,
    from?: Date,
    to?: Date,
  ): Promise<RecurringDetectionResult> {
    const MIN_OCCURRENCES = 2;
    const MIN_DAYS_INTERVAL = 25; // 30 - 5
    const MAX_DAYS_INTERVAL = 35; // 30 + 5
    const AMOUNT_VARIATION_THRESHOLD = 0.1; // < 10%

    // Definir la periode d'analyse (lookback de X mois)
    const now = new Date();
    const refYear = year ?? now.getUTCFullYear();
    const refMonth = month ?? now.getUTCMonth() + 1;
    const analysisDate =
      to ?? new Date(Date.UTC(refYear, refMonth, 0, 23, 59, 59, 999));
    const cutoffDate =
      from ??
      new Date(analysisDate.getTime() - months * 30 * 24 * 60 * 60 * 1000);

    const debits = filterTransactions(transactions, {
      customerId,
      type: 'DEBIT',
      from: cutoffDate,
      to: analysisDate,
    });

    // 1. Grouper les DEBIT par description similaire
    const groupedByDescription = new Map<string, Transaction[]>();
    for (const tx of debits) {
      if (tx.description) {
        const normalizedDesc = this.normalizeDescription(tx.description);
        const group = groupedByDescription.get(normalizedDesc) || [];
        group.push(tx);
        groupedByDescription.set(normalizedDesc, group);
      }
    }

    const recurringExpenses: RecurringExpense['recurringExpenses'] = [];
    const recurringTransactionIds = new Set<string>();

    for (const group of groupedByDescription.values()) {
      // 2. Garder ceux qui apparaissent >= 2 fois
      if (group.length < MIN_OCCURRENCES) continue;

      group.sort(
        (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime(),
      );

      let isRecurring = true;
      const intervals: number[] = [];
      const amounts = group.map((tx) => new Decimal(tx.amount.toString()));

      for (let i = 1; i < group.length; i++) {
        const prevTx = group[i - 1];
        const currentTx = group[i];

        // 3. Verifier que l'ecart entre occurrences est ~30 jours (+/- 5 jours)
        const daysDiff =
          (currentTx.transactionDate.getTime() -
            prevTx.transactionDate.getTime()) /
          (1000 * 3600 * 24);
        intervals.push(daysDiff);

        if (daysDiff < MIN_DAYS_INTERVAL || daysDiff > MAX_DAYS_INTERVAL) {
          isRecurring = false;
          break;
        }

        // 4. Verifier que les montants sont similaires (ecart < 10%)
        const amountA = new Decimal(prevTx.amount.toString());
        const amountB = new Decimal(currentTx.amount.toString());
        if (amountA.isZero()) {
          isRecurring = false;
          break;
        }
        const variation = amountA.minus(amountB).abs().div(amountA);
        if (variation.gt(AMOUNT_VARIATION_THRESHOLD)) {
          isRecurring = false;
          break;
        }
      }

      if (isRecurring) {
        group.forEach((tx) => recurringTransactionIds.add(tx.id));
        const totalAmount = amounts.reduce(
          (sum, val) => sum.plus(val),
          new Decimal(0),
        );
        const averageAmount = totalAmount.div(amounts.length);
        const lastTx = group[group.length - 1];
        const avgInterval =
          intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

        recurringExpenses.push({
          description: group[0].description!,
          averageAmount: averageAmount.toDP(0).toNumber(),
          frequency: 'MONTHLY',
          occurrences: group.length,
          nextExpectedDate: new Date(
            lastTx.transactionDate.getTime() +
              (avgInterval || 30) * 24 * 3600 * 1000,
          )
            .toISOString()
            .split('T')[0],
          category: await this.classifier.categorizeWithCache(
            group[0].description!,
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

  /**
   * US-02.4 — Depenses variables
   * Calcule la part des depenses non recurrentes.
   */
  async calculateVariableExpenses(
    transactions: Transaction[],
    customerId: string,
    year?: number,
    month?: number,
    from?: Date,
    to?: Date,
  ): Promise<VariableExpenseAnalytics> {
    // 1. Obtenir toutes les depenses de la periode
    const periodDebits = filterTransactions(transactions, {
      customerId,
      type: 'DEBIT',
      year,
      month,
      from,
      to,
    });

    const totalExpenses = periodDebits.reduce(
      (sum, tx) => sum.plus(new Decimal(tx.amount.toString())),
      new Decimal(0),
    );

    // 2. Identifier les transactions recurrentes (sur un historique large pour plus de precision)
    const { recurringTransactionIds } = await this.detectRecurringExpenses(
      transactions,
      customerId,
      12, // Lookback de 12 mois pour detecter la recurrence
      year,
      month,
      from,
      to,
    );

    const recurringAmountInPeriod = periodDebits
      .filter((tx) => recurringTransactionIds.has(tx.id))
      .reduce(
        (sum, tx) => sum.plus(new Decimal(tx.amount.toString())),
        new Decimal(0),
      );

    // 3. Extraire les transactions variables (non recurrentes)
    const variableTransactions = periodDebits
      .filter((tx) => !recurringTransactionIds.has(tx.id))
      .map((tx) => ({
        id: tx.id,
        description: tx.description ?? '',
        amount: new Decimal(tx.amount.toString()).toNumber(),
        date: tx.transactionDate.toISOString().split('T')[0],
      }));

    // 4. Calculer le total variable et son pourcentage
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

  /**
   * US-02.5 — Ratio depenses / revenus
   * Calcule le ratio et fournit un score/interpretation base sur les seuils standards.
   */

  async calculateExpenseRatio(
    totalRevenues: number,
    totalExpenses: number,
  ): Promise<ExpenseRatioAnalytics> {
    // 1. Calcul du ratio : Total depenses / Total revenus * 100
    const ratio =
      totalRevenues > 0
        ? new Decimal(totalExpenses)
            .div(totalRevenues)
            .times(100)
            .toDP(1)
            .toNumber()
        : totalExpenses > 0
          ? 100 // Si revenus = 0 et depenses > 0, ratio = 100% (ou plus, mais on plafonne pour l'affichage)
          : 0;

    // 2. Obtenir l'interpretation et le score via le Classifier
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
