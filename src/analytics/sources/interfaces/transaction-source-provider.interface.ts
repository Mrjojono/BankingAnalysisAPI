import { Entry, Transaction } from '../../types';

/**
 * Token NestJS utilisé pour l'injection multi-source.
 * Chaque source enregistre ce token avec useFactory dans TransactionSourcesModule.
 */
export const TRANSACTION_SOURCE_PROVIDER = Symbol(
  'TRANSACTION_SOURCE_PROVIDER',
);

/**
 * Contrat que TOUTE source de transactions doit respecter.
 *
 * Principe "boulon" (plugin) :
 * - Une source = un fichier qui implémente cette interface
 * - Les méthodes sont TOUTES optionnelles (avec `?`)
 * - Une source implémente UNIQUEMENT ce qu'elle peut fournir
 * - Si une méthode n'est pas implémentée, le Registry l'ignore
 *
 * @example
 * ```typescript
 * class TMoneySource implements TransactionSourceProvider {
 *   readonly name = 'tmoney';
 *   isAvailable() { ... }
 *   fetchEntries(customerId, from, to) { ... }
 * }
 * ```
 */
export interface TransactionSourceProvider {
  /** Nom unique de la source (ex: 'db-source', 'tmoney', 'moov') */
  readonly name: string;

  /**
   * Vérifie si la source est accessible.
   * - DB → test avec SELECT 1
   * - API externe → health check HTTP
   * - Retourne `false` si la source n'est pas configurée (pas de stack)
   */
  isAvailable(): Promise<boolean>;

  /**
   * Récupère les écritures comptables (double-entry) d'un client.
   * C'est la méthode PRINCIPALE pour l'analyse financière.
   * Les engines (Revenue, Expense, etc.) travaillent sur des Entry[].
   */
  fetchEntries?(customerId: string, from?: Date, to?: Date): Promise<Entry[]>;

  /**
   * Récupère les transactions brutes d'un client.
   * Utile pour la reconstruction de solde et la prévisualisation du classifieur.
   */
  fetchTransactions?(
    customerId: string,
    from?: Date,
    to?: Date,
  ): Promise<Transaction[]>;

  /**
   * Transactions antérieures à une date donnée.
   * Utilisé par BalanceReconstructor pour les soldes historiques.
   */
  fetchTransactionsBeforeDate?(
    customerId: string,
    date: Date,
  ): Promise<Transaction[]>;

  /**
   * Date de la transaction la plus récente du client.
   * Utilisé comme date de référence pour les analyses.
   */
  getLatestTransactionDate?(customerId: string): Promise<Date | null>;

  /**
   * Récupère les comptes bancaires du client par type.
   * Spécifique à la base de données (les APIs mobiles ne remontent pas les comptes).
   */
  fetchCustomerAccountsByType?(
    customerId: string,
    type: string,
  ): Promise<any[]>;

  /**
   * Snapshots de solde journalier.
   * Spécifique à la base de données.
   */
  getDailyBalance?(accountId: string): Promise<any[]>;
}
