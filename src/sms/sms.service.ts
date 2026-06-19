/**
 * sms.service.ts — Service de synchronisation des SMS Mobile Money.
 *
 * Reçoit les SMS bruts depuis l'application mobile,
 * les parse, déduplique et insère dans sms_transactions.
 */

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseSms } from '../analytics/sources/sms/sms-parser';
import { Classifier } from '../analytics/shared/classifier';
import { ExpenseCategory } from '../analytics/config/expense-keywords';

interface RawSms {
  id: number;
  address: string;
  body: string;
  dateSent: string | Date;
}

export interface SyncResult {
  synced: number;
  duplicates: number;
  skipped: number;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly classifier: Classifier,
  ) {}

  /**
   * Synchronise les SMS bruts d'un client identifié par son userId (JWT).
   * Résout le customerId via la table user_bank_connections.
   */
  async syncSmsFromUser(
    userId: string,
    messages: RawSms[],
  ): Promise<SyncResult> {
    const connection = await this.prisma.userBankConnection.findFirst({
      where: { userId },
    });

    if (!connection) {
      throw new UnauthorizedException(
        'Aucun compte bancaire lié à cet utilisateur',
      );
    }

    const customerId = connection.bankCustomerId;
    this.logger.log(`SMS pour le client ${customerId} (user ${userId})`);

    return this.syncSms(customerId, messages);
  }

  /**
   * Synchronise les SMS bruts d'un client (interne, utiliser syncSmsFromUser).
   * Filtre les SMS non-financiers via parseSms + Classifier.
   */
  async syncSms(customerId: string, messages: RawSms[]): Promise<SyncResult> {
    if (!messages || !Array.isArray(messages)) {
      return { synced: 0, duplicates: 0, skipped: 0 };
    }

    let synced = 0;
    let duplicates = 0;
    const skipReasons = {
      noId: 0,
      invalidDate: 0,
      parseEmpty: 0,
      classifierDivers: 0,
      classifierError: 0,
    };

    const existing = await this.prisma.smsTransaction.findMany({
      where: { customerId },
      select: { smsId: true },
    });
    const existingIds = new Set(existing.map((e) => e.smsId));

    const toCreate: any[] = [];

    for (const msg of messages) {
      if (msg.id == null) {
        skipReasons.noId++;
        continue;
      }

      if (existingIds.has(msg.id)) {
        duplicates++;
        continue;
      }

      const dateSent = new Date(msg.dateSent);
      if (isNaN(dateSent.getTime())) {
        skipReasons.invalidDate++;
        continue;
      }

      const parsed = parseSms(msg.address, msg.body);

      if (parsed.amount === null && parsed.direction === null) {
        skipReasons.parseEmpty++;
        continue;
      }

      if (parsed.amount === null || parsed.direction === null) {
        try {
          const result = await this.classifier.categorizeWithCache(msg.body);
          if (result === ExpenseCategory.DIVERS) {
            skipReasons.classifierDivers++;
            continue;
          }
        } catch {
          skipReasons.classifierError++;
          continue;
        }
      }

      toCreate.push({
        customerId,
        smsId: msg.id,
        address: msg.address,
        body: msg.body.slice(0, 500),
        amount: parsed.amount,
        direction: parsed.direction,
        operator: parsed.operator,
        sender: parsed.sender,
        dateSent,
      });

      existingIds.add(msg.id);
    }

    if (toCreate.length > 0) {
      for (let i = 0; i < toCreate.length; i += 500) {
        const batch = toCreate.slice(i, i + 500);
        await this.prisma.smsTransaction.createMany({
          data: batch,
          skipDuplicates: true,
        });
      }
      synced = toCreate.length;
      this.logger.log(`${synced} SMS synchronisés pour ${customerId}`);
    }

    const totalSkipped = Object.values(skipReasons).reduce((a, b) => a + b, 0);
    if (totalSkipped > 0) {
      this.logger.log(
        `${totalSkipped} SMS ignorés pour ${customerId} (noId:${skipReasons.noId}, dateInvalide:${skipReasons.invalidDate}, parseVide:${skipReasons.parseEmpty}, classifierDivers:${skipReasons.classifierDivers}, classifierError:${skipReasons.classifierError})`,
      );
    }

    return { synced, duplicates, skipped: totalSkipped };
  }

  async debugFilter(address: string, body: string, rawDate?: string) {
    const parseSmsResult = parseSms(address, body);

    const dateSent = rawDate ? new Date(rawDate) : null;
    const dateValid = dateSent ? !isNaN(dateSent.getTime()) : null;

    let classifierResult: any = null;
    let classifierError: string | null = null;
    try {
      classifierResult = this.classifier.testAll(body);
    } catch (e: any) {
      classifierError = e.message;
    }

    const steps: Record<string, any> = {
      parseSms: {
        operator: parseSmsResult.operator,
        direction: parseSmsResult.direction,
        amount: parseSmsResult.amount,
        sender: parseSmsResult.sender,
      },
      dateValidation: {
        raw: rawDate ?? null,
        valid: dateValid,
      },
      classifier: classifierResult ?? { error: classifierError },
    };

    let verdict: string;
    let reason: string;

    if (parseSmsResult.amount !== null && parseSmsResult.direction !== null) {
      verdict = 'INSERT';
      reason = 'parseSms OK (amount + direction)';
    } else if (
      parseSmsResult.amount === null &&
      parseSmsResult.direction === null
    ) {
      verdict = 'SKIP';
      reason = 'Aucune donnée financière détectée';
    } else {
      const cat =
        classifierResult?.winner ?? classifierResult?.category ?? 'DIVERS';
      if (cat === ExpenseCategory.DIVERS) {
        verdict = 'SKIP';
        reason = 'Classifié DIVERS (pas une transaction financière)';
      } else {
        verdict = 'INSERT';
        reason = `Classifié comme ${cat}`;
      }
    }

    return { steps, verdict, reason };
  }
}
