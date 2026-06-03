import { Debt, Transaction } from '../types';
import Decimal from 'decimal.js';
import { Classifier } from '../shared/classifier';
import { filterTransactions } from '../helper';
import { Injectable } from '@nestjs/common';

/**
 * Moteur d'analyse des dettes (EPIC 03).
 */
@Injectable()
export class DebtEngine {
  constructor(private classifier: Classifier) {}

  /**
   * US-03.1 — Détection des dettes
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
}
