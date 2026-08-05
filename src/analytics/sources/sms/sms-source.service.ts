import { Injectable, Logger } from '@nestjs/common';
import { TransactionSourceProvider } from '../interfaces/transaction-source-provider.interface';
import { Entry } from '../../types';
import { PrismaService } from '../../../prisma/prisma.service';
import { EncryptionService } from '../../../encryption/encryption.service';

/**
 * Source SMS (Mobile Money).
 *
 * Cette source lit les transactions depuis la table sms_transactions,
 * alimentée par l'application mobile qui synchronise les SMS bancaires
 * (TMoney, Flooz, Moov MTN, Wave…) via l'endpoint POST /api/sms/sync.
 *
 * Principe :
 * - L'app mobile envoie les SMS bruts → endpoint /api/sms/sync
 * - Le parseur extrait montant, direction, opérateur
 * - SmsSource.fetchEntries() lit les données parsées dans la BDD
 *
 * Aucune variable d'environnement requise.
 * Fonctionne dès qu'il y a des données dans sms_transactions.
 */
@Injectable()
export class SmsSource implements TransactionSourceProvider {
  readonly name = 'sms';
  private readonly logger = new Logger(SmsSource.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Toujours disponible si la base est accessible.
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      this.logger.warn('Base de données inaccessible pour SmsSource');
      return false;
    }
  }

  /**
   * Récupère les transactions parsées depuis les SMS d'un client.
   * Convertit chaque SmsTransaction en Entry[] standard.
   */
  async fetchEntries(
    customerId: string,
    from?: Date,
    to?: Date,
  ): Promise<Entry[]> {
    const where: any = { customerId, status: 'APPROVED' };

    if (from || to) {
      where.dateSent = {};
      if (from) where.dateSent.gte = from;
      if (to) where.dateSent.lte = to;
    }

    const smsList = await this.prisma.smsTransaction.findMany({
      where,
      orderBy: { dateSent: 'desc' },
    });

    this.logger.log(
      `${smsList.length} SMS trouvés pour le client ${customerId}`,
    );

    return smsList.map((sms) => this.toEntry(sms));
  }

  /**
   * Convertit un SmsTransaction en Entry (écriture comptable normalisée).
   */
  private toEntry(sms: any): Entry {
    const isDebit = sms.direction === 'DEBIT';
    const direction = sms.direction ?? 'CREDIT';
    const amount = sms.amount ?? 0;
    let decryptedBody = '(chiffré)';
    try {
      decryptedBody = this.encryption.decrypt(sms.body);
    } catch {
      this.logger.warn(
        `Impossible de déchiffrer le body du SMS ${sms.id}`,
      );
    }

    const description = [
      sms.operator,
      sms.sender ? `(${sms.sender})` : null,
      decryptedBody.slice(0, 500),
    ]
      .filter(Boolean)
      .join(' ');

    return {
      id: `sms-${sms.id}`,
      direction: direction as 'DEBIT' | 'CREDIT',
      amount: BigInt(amount),
      transactionId: `sms-tx-${sms.id}`,
      accountId: isDebit ? 'sms-debit' : 'sms-credit',
      source: 'sms',
      transaction: {
        id: `sms-tx-${sms.id}`,
        amount: BigInt(amount),
        createdAt: sms.dateSent,
        transactionDate: sms.dateSent,
        description,
        category: sms.category ?? undefined,
      },
      account: {
        id: isDebit ? 'sms-debit' : 'sms-credit',
        code: isDebit ? 'SMS_DEBIT' : 'SMS_CREDIT',
        name: `Mobile Money ${direction === 'CREDIT' ? 'Entrant' : 'Sortant'}`,
        glAccountType: isDebit ? 'EXPENSE' : 'REVENUE',
        balanceType: isDebit ? 'DEBIT' : 'CREDIT',
        settledBalance: BigInt(amount),
        bankAccount: {
          id: `sms-ba-${sms.id}`,
          customerId: sms.customerId,
          accountId: isDebit ? 'sms-debit' : 'sms-credit',
          accountType: 'MOBILE_MONEY' as const,
          currency: 'XOF',
        },
      },
    };
  }
}
