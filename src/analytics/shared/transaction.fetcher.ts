import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Transaction, TransactionStatus, Entry } from '../types';

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
      journalId: tx.journalId,
      ledgerId: tx.ledgerId,
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
    const txs = await this.prisma.transaction.findMany({
      where: {
        status: 'POSTED',
      },
    });
    return txs.map(this.mapTransaction);
  }

  async fetchCustomerAllTransactions(
    accountId: string,
  ): Promise<Transaction[]> {
    const txs = await this.prisma.transaction.findMany({
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
    return txs.map(this.mapTransaction);
  }

  async fetchCustomerTransactionsBeforeDate(
    accountId: string,
    date: Date,
  ): Promise<Transaction[]> {
    const txs = await this.prisma.transaction.findMany({
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
        transactionDate: 'desc',
      },
    });
    return txs.map(this.mapTransaction);
  }

  async fetchCustomerTransactionsBetweenDates(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]> {
    const txs = await this.prisma.transaction.findMany({
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
    });
    return txs.map(this.mapTransaction);
  }

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

  async fetchCustomerAccounts(customerId: string): Promise<any[]> {
    return this.prisma.bankAccount.findMany({
      where: { customerId },
      include: {
        account: true,
      },
    });
  }

  async fetchCustomerAccountsByType(
    customerId: string,
    type: 'CHECKING' | 'SAVINGS' | 'LOAN' | 'CORPORATE',
  ): Promise<any[]> {
    return this.prisma.bankAccount.findMany({
      where: {
        customerId,
        accountType: type,
      },
      include: {
        account: true,
      },
    });
  }

  async fetchCustomerEntries(
    customerId: string,
    from?: Date,
    to?: Date,
  ): Promise<Entry[]> {
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
    });

    return entries as unknown as Entry[];
  }

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
