import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelRegistryService } from '../models/model-registry.service';
import { CamenBertTokenizer } from './camenbert-tokenizer';
import type { CamenBertResult } from './camenbert.types';
import { Tensor } from 'onnxruntime-node';

/**
 * Labels de transaction pour CamenBert.
 *
 * CamenBert classifie le TYPE de transaction bancaire (crédit/débit + motif).
 * C'est un niveau plus bas que les intents du Classifieur (analytics)
 * qui raisonnent en catégories de dépenses (LOGEMENT, ALIMENTATION...).
 *
 * Complémentarité:
 *   RegEx → parse brut (direction, montant)
 *   CamenBert → type de transaction (CREDIT_DEPOT, DEBIT_PAIEMENT...)
 *   Classifieur → intention catégorielle (LOGEMENT_HIGH, ALIMENTATION_SPIKE...)
 *
 * Exemple de flux:
 *   SMS "Virement de 50 000 F reçu de M. Kodjo"
 *     → RegEx:  CREDIT, 50000
 *     → CamenBert: CREDIT_TRANSFERT (confiance 0.92)
 *     → Classifieur: INCOME_DROP ou GOOD_HABIT (selon contexte client)
 */
const LABELS = [
  'CREDIT_DEPOT',
  'CREDIT_SALAIRE',
  'CREDIT_TRANSFERT',
  'DEBIT_PAIEMENT',
  'DEBIT_RETRAIT',
  'DEBIT_TRANSFERT',
  'DEBIT_ACHAT_CREDIT',
  'DEBIT_FRAIS',
  'UNKNOWN',
] as const;

const MODEL_NAME = 'camenbert';

@Injectable()
export class CamenBertService {
  private readonly logger = new Logger(CamenBertService.name);
  private readonly tokenizer = new CamenBertTokenizer();
  private ready = false;
  private enabled: boolean;
  private lazy: boolean;
  private threshold: number;
  private modelPath: string;
  private vocabPath: string;
  private loadError: string | null = null;
  private metrics = {
    totalInferences: 0,
    nullResults: 0,
    totalLatencyMs: 0,
    lastLatencyMs: 0,
  };

  constructor(
    private readonly registry: ModelRegistryService,
    @Optional() private readonly config?: ConfigService,
  ) {
    this.enabled = this.config?.get<boolean>('CAMENBERT_ENABLED', true) ?? true;
    this.lazy =
this.config?.get<boolean>('CAMENBERT_LAZY', true) ?? true;
    this.threshold =
      this.config?.get<number>('CAMENBERT_THRESHOLD', 0.75) ?? 0.75;
    this.modelPath =
      this.config?.get<string>('CAMENBERT_MODEL_PATH') ??
      'models/camenbert/camenbert-int8.onnx';
    this.vocabPath =
      this.config?.get<string>('CAMENBERT_VOCAB_PATH') ??
      'models/camenbert/vocab.txt';

    if (!this.enabled) {
      this.logger.log('CamenBert désactivé via CAMENBERT_ENABLED=false');
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) return;

    await this.registry.register({
      name: MODEL_NAME,
      path: this.modelPath,
    });

    const tokLoaded = await this.tokenizer.load(this.vocabPath);
    if (!tokLoaded) {
      this.logger.warn('Tokenizer non chargé — CamenBert désactivé');
      return;
    }

    if (!this.lazy) {
      await this.loadModel();
    } else {
      this.logger.log(
        'CamenBert en mode lazy — chargement à la première requête',
      );
    }
  }

  private async loadModel(): Promise<boolean> {
    if (this.ready) return true;
    this.loadError = null;
    const loaded = await this.registry.load(MODEL_NAME);
    if (!loaded) {
      this.loadError = this.registry.getErrorMessage(MODEL_NAME) ||
        'Modele ONNX introuvable. Lancez: bash src/sms/camenbert/scripts/download-camenbert.sh';
      this.logger.warn(this.loadError);
      return false;
    }
    this.ready = true;
    this.logger.log('CamenBert prêt');
    return true;
  }

  isReady(): boolean {
    return this.enabled && this.ready;
  }

  isLoaded(): boolean {
    return this.ready;
  }

  getLoadError(): string | null {
    return this.loadError;
  }

  async reload(): Promise<boolean> {
    this.ready = false;
    return this.loadModel();
  }

  async ensureLoaded(): Promise<boolean> {
    if (this.ready) return true;
    return this.loadModel();
  }

  async classify(body: string): Promise<CamenBertResult | null> {
    if (!this.enabled) return null;
    if (!(await this.ensureLoaded())) return null;

    const start = Date.now();
    try {
      const session = this.registry.getSession(MODEL_NAME);
      if (!session) { this.metrics.nullResults++; return null; }

      const { inputIds, attentionMask } = this.tokenizer.encode(body);
      if (inputIds.length === 0) { this.metrics.nullResults++; return null; }

      const ort = await import('onnxruntime-node');
      const feeds: Record<string, Tensor> = {
        input_ids: new ort.Tensor('int64', inputIds, [1, inputIds.length]),
        attention_mask: new ort.Tensor('int64', attentionMask, [
          1,
          attentionMask.length,
        ]),
      };

      const results = await session.run(feeds);
      const logitsTensor =
        results.logits ?? results.output ?? Object.values(results)[0];
      const logitsData = logitsTensor.data as Float32Array;

      const scores = softmax(Array.from(logitsData));
      const maxIdx = scores.indexOf(Math.max(...scores));
      const confidence = scores[maxIdx];

      const label = LABELS[maxIdx] ?? 'UNKNOWN';
      const direction: 'DEBIT' | 'CREDIT' | null = label.startsWith('CREDIT')
        ? 'CREDIT'
        : label.startsWith('DEBIT')
          ? 'DEBIT'
          : null;

      const rawScores: Record<string, number> = {};
      for (let i = 0; i < scores.length; i++) {
        rawScores[LABELS[i] ?? `CLASS_${i}`] = scores[i];
      }

      const elapsed = Date.now() - start;
      this.metrics.totalInferences++;
      this.metrics.totalLatencyMs += elapsed;
      this.metrics.lastLatencyMs = elapsed;

      return { category: label, direction, confidence, rawScores };
    } catch (err) {
      this.metrics.nullResults++;
      this.logger.error(`Erreur inference: ${(err as Error).message}`);
      return null;
    }
  }

  getMetrics() {
    const { totalInferences, nullResults, totalLatencyMs, lastLatencyMs } = this.metrics;
    return {
      totalInferences,
      nullResults,
      nullRate: totalInferences > 0 ? nullResults / totalInferences : 0,
      avgLatencyMs: totalInferences > 0 ? totalLatencyMs / totalInferences : 0,
      lastLatencyMs,
    };
  }

  getThreshold(): number {
    return this.threshold;
  }

  isLazy(): boolean {
    return this.lazy;
  }

  getLabels(): readonly string[] {
    return LABELS;
  }
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}
