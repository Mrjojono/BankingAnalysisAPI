import { Injectable } from '@nestjs/common';
import { TransactionSourceRegistry } from '../sources/registry/transaction-source-registry';
import Decimal from 'decimal.js';
import { Transaction, TransactionStatus } from '../types';

type DailyBalance = {
  date: string;
  balance: string;
};

@Injectable()
export class BalanceReconstructor {
  constructor(private sourceRegistry: TransactionSourceRegistry) {}

  /**
   * Reconstruit le solde d'un client à un instant T (date spécifiée).
   * Calcule la somme de toutes les transactions (CREDIT - DEBIT) antérieures à cette date.
   *
   * @param accountId - Identifiant unique du client.
   * @param date - Date charnière pour le calcul du solde.
   * @returns Le solde calculé sous forme de Decimal.
   */
  async reconstructBalance(accountId: string, date: Date): Promise<Decimal> {
    // On récupère toutes les transactions STRICTEMENT antérieures à la date donnée
    const transactions =
      await this.sourceRegistry.aggregateTransactionsBeforeDate(
        accountId,
        date,
      );

    let balance = new Decimal(0);

    for (const tx of transactions) {
      // Sécurité : on ne compte que les transactions confirmées
      if (tx.status && tx.status !== TransactionStatus.POSTED) continue;

      const amount = new Decimal(tx.amount.toString());

      if (tx.senderCustomerId === accountId) {
        // Débit : l'argent sort du compte
        balance = balance.minus(amount);
      } else if (tx.receiverCustomerId === accountId) {
        // Crédit : l'argent entre sur le compte
        balance = balance.plus(amount);
      }
    }

    return balance;
  }

  /**
   * Récupère les instantanés (snapshots) de solde enregistrés en base.
   * Utile pour avoir des points de repère officiels fournis par la banque.
   *
   * @param accountId - Identifiant du client.
   */
  async getDailyBalance(accountId: string) {
    const snapshots = await this.sourceRegistry.getDailyBalance(accountId);

    return snapshots.map((s) => ({
      date: s.snapshotDate.toISOString().split('T')[0],
      settled: s.settledBalance.toString(),
      pending: s.pendingBalance.toString(),
      available: s.availableBalance.toString(),
    }));
  }

  /**
   * Moteur de reconstruction de solde journalier à partir d'un set de transactions.
   * (Version simplifiée, préférez BalanceEngine pour les analyses US-03.x)
   *
   * @param transactions - Liste des transactions à traiter.
   * @param customerId - ID du client.
   * @param initialBalance - Solde de départ.
   */
  reconstructDailyBalanceEngine(
    transactions: Transaction[],
    customerId: string,
    initialBalance: Decimal,
  ): DailyBalance[] {
    let balance = initialBalance;
    const resultMap = new Map<string, Decimal>();

    // On s'assure que les transactions sont triées par date
    const sortedTxs = [...transactions].sort(
      (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime(),
    );

    for (const tx of sortedTxs) {
      if (tx.status && tx.status !== TransactionStatus.POSTED) continue;

      const date = tx.transactionDate.toISOString().split('T')[0];
      const amount = new Decimal(tx.amount.toString());

      if (tx.senderCustomerId === customerId) {
        balance = balance.minus(amount);
      } else if (tx.receiverCustomerId === customerId) {
        balance = balance.plus(amount);
      }

      // On garde le dernier solde connu pour chaque journée présente dans les transactions
      resultMap.set(date, balance);
    }

    return Array.from(resultMap.entries()).map(([date, balance]) => ({
      date,
      balance: balance.toString(),
    }));
  }
}
