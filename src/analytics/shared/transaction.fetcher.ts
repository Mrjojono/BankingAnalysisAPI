import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Transaction, TransactionStatus } from '../types';

@Injectable()
export class TransactionFetcher {
  constructor(private prisma: PrismaService) {}

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
    };
  };
  async getDailyBalance(accountId: string) {
    return this.prisma.accountBalanceSnapshot.findMany({
      where: {
        accountId,
      },
      orderBy: {
        snapshotDate: 'asc',
      },
    });
  }
  async fetchAllTransactions(): Promise<Transaction[]> {
    return this.prisma.transaction
      .findMany({
        where: {
          status: 'POSTED',
        },
      })
      .then((txs) => txs.map(this.mapTransaction));
  }

  //permet de récupérer toutes les transactions d'un client qu'il a recu ou envoyer
  async fetchCustomerAllTransactions(
    accountId: string,
  ): Promise<Transaction[]> {
    return this.prisma.transaction
      .findMany({
        where: {
          OR: [
            { senderCustomerId: accountId },
            { receiverCustomerId: accountId },
          ],
          status: 'POSTED',
        },
        orderBy: {
          transactionDate: 'desc',
        },
      })
      .then((txs) => txs.map(this.mapTransaction));
  }

  // Récupérer les transactions d'un client entre deux dates
  async fetchCustomerTransactionsBetweenDates(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]> {
    return this.prisma.transaction
      .findMany({
        where: {
          OR: [
            { senderCustomerId: accountId },
            { receiverCustomerId: accountId },
          ],
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
          status: 'POSTED',
        },
        orderBy: {
          transactionDate: 'desc',
        },
      })
      .then((txs) => txs.map(this.mapTransaction));
  }

  // Récupérer les transactions d'un client à partir d'une date donnée
  async fetchCustomerTransactionsByDate(
    accountId: string,
    date: Date,
  ): Promise<Transaction[]> {
    return this.prisma.transaction
      .findMany({
        where: {
          OR: [
            { senderCustomerId: accountId },
            { receiverCustomerId: accountId },
          ],
          transactionDate: {
            gte: date,
          },
          status: 'POSTED',
        },
        orderBy: {
          transactionDate: 'desc',
        },
      })
      .then((txs) => txs.map(this.mapTransaction));
  }

  // R\u00e9cup\u00e9rer les transactions d'un client AVANT une date donn\u00e9e (pour reconstruction de solde)
  async fetchCustomerTransactionsBeforeDate(
    accountId: string,
    date: Date,
  ): Promise<Transaction[]> {
    return this.prisma.transaction
      .findMany({
        where: {
          OR: [
            { senderCustomerId: accountId },
            { receiverCustomerId: accountId },
          ],
          transactionDate: {
            lt: date,
          },
          status: 'POSTED',
        },
        orderBy: {
          transactionDate: 'asc',
        },
      })
      .then((txs) => txs.map(this.mapTransaction));
  }

  /**
   * R\u00e9cup\u00e8re la date de la toute derni\u00e8re transaction d'un client.
   * Sert de base pour les analyses par d\u00e9faut (si aucune date n'est fournie).
   */
  async getLatestTransactionDate(accountId: string): Promise<Date | null> {
    const lastTx = await this.prisma.transaction.findFirst({
      where: {
        OR: [
          { senderCustomerId: accountId },
          { receiverCustomerId: accountId },
        ],
        status: 'POSTED',
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });

    return lastTx?.transactionDate ?? null;
  }
}
