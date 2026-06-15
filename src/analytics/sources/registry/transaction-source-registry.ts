import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TRANSACTION_SOURCE_PROVIDER,
  TransactionSourceProvider,
} from '../interfaces/transaction-source-provider.interface';
import { Entry, Transaction } from '../../types';

/**
 * Point d'entrée unique pour toutes les sources de transactions.
 *
 * Le Registry est injecté DANS les services qui ont besoin de données
 * (OverviewService, BalanceReconstructor, AdviceEngine) à la place
 * de l'ancien TransactionFetcher.
 *
 * Principe de fonctionnement :
 * 1. Il récupère la liste de TOUTES les sources enregistrées
 * 2. Il appelle `isAvailable()` sur chacune
 * 3. Il interroge UNIQUEMENT les sources disponibles
 * 4. Il fusionne les résultats (entries, transactions)
 * 5. Il déduplique par ID
 * 6. Une source qui échoue est ignorée silencieusement
 */
@Injectable()
export class TransactionSourceRegistry {
  private readonly logger = new Logger(TransactionSourceRegistry.name);

  constructor(
    @Inject(TRANSACTION_SOURCE_PROVIDER)
    private readonly sources: TransactionSourceProvider[],
  ) {}

  /**
   * Retourne uniquement les sources qui sont accessibles.
   * Utilise Promise.allSettled pour qu'une source indisponible
   * ne bloque pas les autres.
   */
  async getAvailableSources(): Promise<TransactionSourceProvider[]> {
    const results = await Promise.allSettled(
      this.sources.map(async (s) => ({
        source: s,
        available: await s.isAvailable(),
      })),
    );

    return results
      .filter(
        (
          r,
        ): r is PromiseFulfilledResult<{
          source: TransactionSourceProvider;
          available: boolean;
        }> => r.status === 'fulfilled' && r.value.available,
      )
      .map((r) => r.value.source);
  }

  /**
   * Agrège les écritures (Entry[]) de toutes les sources disponibles.
   * Chaque source peut fournir des écritures différentes :
   * - DB source → toutes les opérations bancaires
   * - TMoney → transactions mobile money
   * - etc.
   */
  async aggregateEntries(
    customerId: string,
    from?: Date,
    to?: Date,
  ): Promise<Entry[]> {
    const available = await this.getAvailableSources();
    const withMethod = available.filter(
      (
        s,
      ): s is TransactionSourceProvider &
        Required<Pick<TransactionSourceProvider, 'fetchEntries'>> =>
        s.fetchEntries !== undefined,
    );
    const results = await Promise.allSettled(
      withMethod.map((s) => s.fetchEntries(customerId, from, to)),
    );

    const all: Entry[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        all.push(...r.value);
      } else {
        this.logger.warn(`Source entries aggregation failed: ${r.reason}`);
      }
    }

    return this.deduplicateEntries(all);
  }

  /**
   * Agrège les transactions (Transaction[]) de toutes les sources disponibles.
   */
  async aggregateTransactions(
    customerId: string,
    from?: Date,
    to?: Date,
  ): Promise<Transaction[]> {
    const available = await this.getAvailableSources();
    const withMethod = available.filter(
      (
        s,
      ): s is TransactionSourceProvider &
        Required<Pick<TransactionSourceProvider, 'fetchTransactions'>> =>
        s.fetchTransactions !== undefined,
    );
    const results = await Promise.allSettled(
      withMethod.map((s) => s.fetchTransactions(customerId, from, to)),
    );

    const all: Transaction[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        all.push(...r.value);
      } else {
        this.logger.warn(`Source transactions aggregation failed: ${r.reason}`);
      }
    }

    return this.deduplicateTransactions(all);
  }

  /**
   * Agrège les transactions antérieures à une date.
   * Utilisé par BalanceReconstructor pour la reconstruction de solde.
   */
  async aggregateTransactionsBeforeDate(
    customerId: string,
    date: Date,
  ): Promise<Transaction[]> {
    const available = await this.getAvailableSources();
    const withMethod = available.filter(
      (
        s,
      ): s is TransactionSourceProvider &
        Required<
          Pick<TransactionSourceProvider, 'fetchTransactionsBeforeDate'>
        > => s.fetchTransactionsBeforeDate !== undefined,
    );
    const results = await Promise.allSettled(
      withMethod.map((s) => s.fetchTransactionsBeforeDate(customerId, date)),
    );

    const all: Transaction[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        all.push(...r.value);
      } else {
        this.logger.warn(`Source transactions before date failed: ${r.reason}`);
      }
    }

    return this.deduplicateTransactions(all);
  }

  /**
   * Retourne la date de transaction la plus récente TOUTES sources confondues.
   * Prend la date la plus récente parmi toutes les sources disponibles.
   */
  async getLatestTransactionDate(customerId: string): Promise<Date | null> {
    const available = await this.getAvailableSources();
    const withMethod = available.filter(
      (
        s,
      ): s is TransactionSourceProvider &
        Required<Pick<TransactionSourceProvider, 'getLatestTransactionDate'>> =>
        s.getLatestTransactionDate !== undefined,
    );
    const results = await Promise.allSettled(
      withMethod.map((s) => s.getLatestTransactionDate(customerId)),
    );

    let latest: Date | null = null;
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        if (!latest || r.value > latest) {
          latest = r.value;
        }
      }
    }

    return latest;
  }

  /**
   * Agrège les comptes par type depuis toutes les sources.
   * Généralement seule la DB source implémente cette méthode.
   */
  async fetchCustomerAccountsByType(
    customerId: string,
    type: string,
  ): Promise<any[]> {
    const available = await this.getAvailableSources();
    const withMethod = available.filter(
      (
        s,
      ): s is TransactionSourceProvider &
        Required<
          Pick<TransactionSourceProvider, 'fetchCustomerAccountsByType'>
        > => s.fetchCustomerAccountsByType !== undefined,
    );
    const results = await Promise.allSettled(
      withMethod.map((s) => s.fetchCustomerAccountsByType(customerId, type)),
    );

    const all: any[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        all.push(...r.value);
      }
    }

    return all;
  }

  /**
   * Agrège les snapshots de solde journalier depuis toutes les sources.
   */
  async getDailyBalance(accountId: string): Promise<any[]> {
    const available = await this.getAvailableSources();
    const withMethod = available.filter(
      (
        s,
      ): s is TransactionSourceProvider &
        Required<Pick<TransactionSourceProvider, 'getDailyBalance'>> =>
        s.getDailyBalance !== undefined,
    );
    const results = await Promise.allSettled(
      withMethod.map((s) => s.getDailyBalance(accountId)),
    );

    const all: any[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        all.push(...r.value);
      }
    }

    return all;
  }

  /** Évite les doublons d'écritures (même ID venu de 2 sources différentes) */
  private deduplicateEntries(entries: Entry[]): Entry[] {
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }

  /** Évite les doublons de transactions (même ID venu de 2 sources) */
  private deduplicateTransactions(txs: Transaction[]): Transaction[] {
    const seen = new Set<string>();
    return txs.filter((tx) => {
      if (seen.has(tx.id)) return false;
      seen.add(tx.id);
      return true;
    });
  }
}
