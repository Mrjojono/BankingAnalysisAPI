import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { parseSms, buildFingerprint } from '../analytics/sources/sms/sms-parser';
import { Classifier } from '../analytics/shared/classifier';
import { ExpenseCategory } from '../analytics/config/expense-keywords';
import { CamenBertService } from './camenbert/camenbert.service';
import { normalizeDateSent } from './sms-date';
import { RedisService } from '../redis/redis.service';
import { CamenBertResult } from './camenbert/camenbert.types';
import {
  arbitrate,
  mapCbCategoryToAnalysis,
} from './pipeline/arbitration';
import {
  DEFAULT_SMS_PIPELINE_CONFIG,
  normalizeSmsPipelineConfig,
  SMS_PIPELINE_CONFIG_KEY,
  SmsPipelineConfig,
} from './pipeline/config';

interface RawSms {
  id: number;
  address: string;
  body: string;
  dateSent?: string | Date | number | null;
  /** Champ Android natif (retourné par les APIs de lecture SMS) */
  date?: string | Date | number | null;
}

export interface SyncResult {
  synced: number;
  duplicates: number;
  skipped: number;
  /** Point de reprise pour la sync incrémentale : dernier SMS reçu */
  watermark?: { smsId: number; dateSent: Date } | null;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly classifier: Classifier,
    private readonly encryption: EncryptionService,
    private readonly camenBert: CamenBertService,
    private readonly redis: RedisService,
  ) {}

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
   * État de synchronisation d'un client (watermark de reprise).
   * Renvoie le dernier SMS reçu, utile pour la sync incrémentale côté mobile.
   */
  async getState(customerId: string) {
    const last = await this.prisma.smsTransaction.findFirst({
      where: { customerId },
      orderBy: { dateSent: 'desc' },
      select: { smsId: true, dateSent: true },
    });
    return {
      watermark: last ? { smsId: last.smsId, dateSent: last.dateSent } : null,
    };
  }

  async getStateFromUser(userId: string) {
    const connection = await this.prisma.userBankConnection.findFirst({
      where: { userId },
    });
    if (!connection) {
      throw new UnauthorizedException(
        'Aucun compte bancaire lié à cet utilisateur',
      );
    }
    return this.getState(connection.bankCustomerId);
  }

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
      select: { smsId: true, fingerprint: true },
    });
    const existingIds = new Set(existing.map((e) => e.smsId));
    const existingFingerprints = new Set(
      existing.map((e) => e.fingerprint).filter((f): f is string => !!f),
    );

    const rules = await this.prisma.smsFilterRule.findMany({
      where: { isActive: true, OR: [{ customerId: null }, { customerId }] },
    });

    const pipelineConfig = await this.getPipelineConfig();

    const toCreate: any[] = [];

    for (const msg of messages) {
      if (msg.id == null) {
        msg.id = hashSms(msg.address, msg.body, msg.dateSent);
        this.logger.warn(
          `ID synthétique pour SMS ${msg.address}: ${msg.body.slice(0, 40)}... → ${msg.id}`,
        );
      }

      if (existingIds.has(msg.id)) {
        duplicates++;
        continue;
      }

      const rawDate = msg.dateSent ?? msg.date ?? null;
      const dateSent = normalizeDateSent(rawDate);
      if (!dateSent) {
        skipReasons.invalidDate++;
        if (skipReasons.invalidDate <= 3) {
          this.logger.warn(
            `Date SMS invalide (${typeof rawDate}): ${JSON.stringify(rawDate)?.slice(0, 80)}`,
          );
        }
        continue;
      }

      const parsed = parseSms(msg.address, msg.body);

      if (parsed.amount === null && parsed.direction === null) {
        skipReasons.parseEmpty++;
        continue;
      }

      if (parsed.amount === null) {
        skipReasons.parseEmpty++;
        continue;
      }

      // Couche 2 : CamenBert arbitre sur CHAQUE SMS si activé
      let cbResult: CamenBertResult | null = null;
      if (pipelineConfig.camenbertEnabled && this.camenBert.isReady()) {
        try {
          cbResult = await this.camenBert.classify(msg.body);
        } catch {
          cbResult = null;
        }
      }

      const arbitration = arbitrate({
        regexDirection: pipelineConfig.regexEnabled
          ? (parsed.direction as 'DEBIT' | 'CREDIT' | null)
          : null,
        regexConfidence: parsed.confidence,
        cbCategory: cbResult?.category ?? null,
        cbDirection: cbResult?.direction ?? null,
        cbConfidence: cbResult?.confidence ?? 0,
        camenbertEnabled: pipelineConfig.camenbertEnabled,
        camenbertThreshold: pipelineConfig.camenbertThreshold,
        amountPresent: parsed.amount !== null,
      });

      parsed.direction = arbitration.direction;

      let status: string = arbitration.status === 'APPROVED' ? 'APPROVED' : 'PENDING';

      if (parsed.direction === null) {
        if (pipelineConfig.regexEnabled && !arbitration.camenbertOk) {
          // Fallback classifier existant : valide que ce n'est pas du bruit
          try {
            const category = await this.classifier.categorizeWithCache(msg.body);
            if (category === ExpenseCategory.DIVERS) {
              skipReasons.classifierDivers++;
              continue;
            }
            parsed.confidence = Math.min(parsed.confidence, 0.6);
          } catch {
            skipReasons.classifierError++;
            continue;
          }
          status = 'PENDING';
        } else {
          skipReasons.parseEmpty++;
          continue;
        }
      }

      const fingerprint = buildFingerprint(parsed, dateSent);
      if (existingFingerprints.has(fingerprint)) {
        duplicates++;
        continue;
      }

      const matchRule = rules.find((r) => this.ruleMatches(r, msg, parsed));
      if (matchRule) status = 'IGNORED';

      // Catégorie d'analyse : type mappé CamenBert, sinon classifier mots-clés
      let category: string | null = arbitration.analysisCategory;
      if (category === null && parsed.direction) {
        try {
          const cat = await this.classifier.categorizeWithCache(msg.body);
          if (cat !== ExpenseCategory.DIVERS) category = cat;
        } catch {}
      }

      toCreate.push({
        customerId,
        smsId: msg.id,
        address: msg.address,
        body: this.encryption.encrypt(msg.body.slice(0, 500)),
        amount: parsed.amount,
        direction: parsed.direction,
        operator: parsed.operator,
        sender: parsed.sender,
        counterparty: parsed.counterparty,
        balanceAfter: parsed.balanceAfter,
        referenceNo: parsed.referenceNo,
        confidence: parsed.confidence,
        cbCategory: arbitration.cbCategory,
        cbConfidence: cbResult?.confidence ?? null,
        category,
        arbitration: arbitration.arbitration,
        disagreed: arbitration.disagreed,
        fingerprint,
        status,
        matchRuleId: matchRule?.id ?? null,
        dateSent,
      });

      existingIds.add(msg.id);
      existingFingerprints.add(fingerprint);
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

    let watermark: SyncResult['watermark'] = null;
    if (toCreate.length > 0) {
      const newest = toCreate.reduce((a, b) =>
        a.dateSent.getTime() >= b.dateSent.getTime() ? a : b,
      );
      watermark = { smsId: newest.smsId, dateSent: newest.dateSent };
    }

    return { synced, duplicates, skipped: totalSkipped, watermark };
  }

  /**
   * Teste si une règle d'ignorance correspond au message/parsage.
   */
  private ruleMatches(
    rule: {
      operator?: string | null;
      address?: string | null;
      keyword?: string | null;
      direction?: string | null;
    },
    msg: RawSms,
    parsed: { operator: string; direction: string | null },
  ): boolean {
    if (rule.operator && rule.operator.toUpperCase() !== parsed.operator.toUpperCase()) return false;
    if (rule.direction && rule.direction.toUpperCase() !== (parsed.direction ?? '').toUpperCase()) return false;
    if (rule.address) {
      const term = rule.address.toLowerCase();
      if (!msg.address.toLowerCase().includes(term) && !msg.body.toLowerCase().includes(term)) return false;
    }
    if (rule.keyword && !msg.body.toLowerCase().includes(rule.keyword.toLowerCase())) return false;
    return true;
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

    let camenBertResult: any = null;
    try {
      if (this.camenBert.isReady()) {
        camenBertResult = await this.camenBert.classify(body);
      }
    } catch {
      camenBertResult = { error: 'Erreur inference' };
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
      camenBert: camenBertResult ?? { error: 'Modèle non chargé' },
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
      if (camenBertResult?.direction && camenBertResult.confidence >= 0.75) {
        verdict = 'INSERT';
        reason = `CamenBert a complété la direction: ${camenBertResult.direction} (${(camenBertResult.confidence * 100).toFixed(0)}%)`;
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
    }

    return { steps, verdict, reason };
  }

  async debugCamenBert(body: string) {
    if (!this.camenBert.isReady()) {
      const loaded = await this.camenBert.ensureLoaded();
      if (!loaded) {
        return { ready: false, message: 'Modèle CamenBert non chargé' };
      }
    }
    const result = await this.camenBert.classify(body);
    const threshold = 0.75;
    return {
      ready: true,
      result,
      threshold,
      wouldInsert: result !== null && result.confidence >= threshold,
    };
  }

  getCamenBertStatus() {
    return {
      ready: this.camenBert.isReady(),
      modelName: 'camenbert-int8',
      threshold: this.camenBert.getThreshold(),
      lazy: this.camenBert.isLazy(),
      labels: this.camenBert.getLabels(),
      loadError: this.camenBert.getLoadError(),
      metrics: this.camenBert.getMetrics(),
    };
  }

  async getPipelineConfig(): Promise<SmsPipelineConfig> {
    const raw = await this.redis.get(SMS_PIPELINE_CONFIG_KEY);
    return normalizeSmsPipelineConfig(raw);
  }

  async updatePipelineConfig(
    partial: Partial<SmsPipelineConfig>,
  ): Promise<SmsPipelineConfig> {
    const current = await this.getPipelineConfig();
    const next: SmsPipelineConfig = { ...current, ...partial };
    await this.redis.set(
      SMS_PIPELINE_CONFIG_KEY,
      JSON.stringify(next),
      30 * 24 * 60 * 60,
    );
    return next;
  }
}

function hashSms(
  address: string,
  body: string,
  dateSent: string | Date | number | null | undefined,
): number {
  const parsed = normalizeDateSent(dateSent ?? null);
  const dateStr = parsed ? parsed.toISOString().slice(0, 10) : 'unknown';
  const raw = `${address}|${body.trim()}|${dateStr}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
