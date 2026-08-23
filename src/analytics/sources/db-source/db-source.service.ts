import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Transaction, TransactionStatus, Entry } from '../../types';
import { TransactionSourceProvider } from '../interfaces/transaction-source-provider.interface';

/**
 * Source de base de données (PostgreSQL via Prisma).
 *
 * C'est la source PAR DÉFAUT — elle est toujours disponible car
 * elle utilise la base de données locale du projet.
 *
 * Anciennement TransactionFetcher (avant le refactor multi-source).
 * Le code est identique, juste wrappé dans l'interface TransactionSourceProvider.
 *
 * Méthodes fournies :
 * - fetchEntries  → écritures comptables (double-entry)
 * - fetchTransactions → transactions brutes
 * - fetchTransactionsBeforeDate → transactions avant une date
 * - getLatestTransactionDate → date de dernière activité
 * - fetchCustomerAccountsByType → comptes bancaires
 * - getDailyBalance → snapshots de solde
 */
@Injectable()
export class DbSource implements TransactionSourceProvider {
  readonly name = 'db-source';
  private readonly logger = new Logger(DbSource.name);

  constructor(private prisma: PrismaService) {}

  /** Vérifie que PostgreSQL est accessible */
  async isAvailable(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      this.logger.warn('Database is not available');
      return false;
    }
  }

  /** Transforme un résultat Prisma brut en Transaction typée */
  private mapTransaction = (tx: any): Transaction => {
    return {
      id: tx.id,
      amount: tx.amount,
      senderCustomerId: tx.senderCustomerId ?? undefined,
      receiverCustomerId: tx.receiverCustomerId ?? undefined,
      createdAt: tx.createdAt,
      transactionDate: tx.transactionDate,
      description: tx.description ?? undefined,
      status: tx.status as TransactionStatus,
      journalId: tx.journalId,
      ledgerId: tx.ledgerId,
    };
  };

  /** Snapshots de solde journalier (AccountBalanceSnapshot) */
  async getDailyBalance(accountId: string): Promise<any[]> {
    return this.prisma.accountBalanceSnapshot.findMany({
      where: { accountId },
      orderBy: { snapshotDate: 'asc' },
    });
  }

  /** Toutes les transactions POSTED (utilitaire) */
  async fetchAllTransactions(): Promise<Transaction[]> {
    const txs = await this.prisma.transaction.findMany({
      where: { status: 'POSTED' },
    });
    return txs.map(this.mapTransaction);
  }

  /**
   * Transactions d'un client avec filtre optionnel par période.
   * Filtre par senderCustomerId OU receiverCustomerId.
   */
  async fetchTransactions(
    customerId: string,
    from?: Date,
    to?: Date,
  ): Promise<Transaction[]> {
    const where: any = {
      OR: [
        { senderCustomerId: customerId },
        { receiverCustomerId: customerId },
      ],
      status: 'POSTED',
    };

    if (from || to) {
      where.transactionDate = {};
      if (from) where.transactionDate.gte = from;
      if (to) where.transactionDate.lte = to;
    }

    const txs = await this.prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
    });
    return txs.map(this.mapTransaction);
  }

  /** Transactions STRICTEMENT antérieures à une date */
  async fetchTransactionsBeforeDate(
    customerId: string,
    date: Date,
  ): Promise<Transaction[]> {
    const txs = await this.prisma.transaction.findMany({
      where: {
        OR: [
          { senderCustomerId: customerId },
          { receiverCustomerId: customerId },
        ],
        transactionDate: { lt: date },
        status: 'POSTED',
      },
      orderBy: { transactionDate: 'desc' },
    });
    return txs.map(this.mapTransaction);
  }

  /** Date de la transaction la plus récente du client */
  async getLatestTransactionDate(customerId: string): Promise<Date | null> {
    const lastTx = await this.prisma.transaction.findFirst({
      where: {
        OR: [
          { senderCustomerId: customerId },
          { receiverCustomerId: customerId },
        ],
        status: 'POSTED',
      },
      orderBy: { transactionDate: 'desc' },
    });

    return lastTx?.transactionDate ?? null;
  }

  /** Tous les comptes bancaires du客户nt */
  async fetchCustomerAccounts(customerId: string): Promise<any[]> {
    return this.prisma.bankAccount.findMany({
      where: { customerId },
      include: { account: true },
    });
  }

  /** Comptes bancaires filtrés par type (CHECKING, SAVINGS, LOAN, CORPORATE) */
  async fetchCustomerAccountsByType(
    customerId: string,
    type: 'CHECKING' | 'SAVINGS' | 'LOAN' | 'CORPORATE',
  ): Promise<any[]> {
    return this.prisma.bankAccount.findMany({
      where: {
        customerId,
        accountType: type,
      },
      include: { account: true },
    });
  }

  /**
   * Écritures comptables (double-entry) d'un client.
   * C'est la méthode PRINCIPALE pour l'analyse financière.
   * Jointure : Entry → Account → BankAccount → customerId
   */
  async fetchEntries(
    customerId: string,
    from?: Date,
    to?: Date,
  ): Promise<Entry[]> {
    if (!from) {
      from = new Date();
      from.setUTCFullYear(from.getUTCFullYear() - 1);
    }

    const entries = await this.prisma.entry.findMany({
      where: {
        account: {
          bankAccount: {
            customerId: customerId,
          },
        },
        transaction: {
          status: 'POSTED',
          transactionDate: {
            gte: from,
            lte: to,
          },
        },
      },
      include: {
        transaction: true,
        account: {
          include: {
            bankAccount: true,
          },
        },
      },
      orderBy: {
        transaction: {
          transactionDate: 'desc',
        },
      },
      take: 10000,
    });

    return (entries as unknown as Entry[]).map((e) => ({
      ...e,
      source: 'bank',
    }));
  }

  /** Écritures pour un compte spécifique */
  async fetchAccountEntries(
    accountId: string,
    from?: Date,
    to?: Date,
  ): Promise<Entry[]> {
    const entries = await this.prisma.entry.findMany({
      where: {
        accountId,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      include: {
        transaction: true,
        account: {
          include: {
            bankAccount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return entries as unknown as Entry[];
  }
}
