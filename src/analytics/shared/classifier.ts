import { Logger, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { EXPENSE_KEYWORDS, ExpenseCategory } from '../config/expense-keywords';
import { EmbeddingClassifier } from '../embeddings/embedding-classifier';
import { Entry } from '../types';
import Fuse from 'fuse.js';
import * as natural from 'natural';
import type { ScoredCategory } from '../embeddings/embedding-classifier';

@Injectable()
export class Classifier implements OnModuleInit {
  private readonly logger = new Logger(Classifier.name);

  // Fuse instance (fuzzy matching)
  private static fuseInstances: Map<ExpenseCategory, Fuse<string>> | null =
    null;

  // Bayes classifier (natural)
  private static bayesClassifier: natural.BayesClassifier | null = null;
  private static bayesTrained = false;

  // Cache des règles globales (mots-clés dynamiques)
  private static globalRules: Record<string, ExpenseCategory> = {};

  constructor(
    private redisService: RedisService,
    @Optional() private readonly embeddingClassifier?: EmbeddingClassifier,
  ) {}

  async onModuleInit() {
    this.initClassifier();
    await this.loadGlobalRules();
  }

  /**
   * Initialisation unique au démarrage
   */
  private initClassifier(): void {
    if (!Classifier.fuseInstances) {
      Classifier.fuseInstances = new Map();
      for (const [category, keywords] of Object.entries(EXPENSE_KEYWORDS)) {
        if (keywords.length === 0) continue;
        Classifier.fuseInstances.set(
          category as ExpenseCategory,
          new Fuse(keywords, {
            threshold: 0.35,
            distance: 80,
            minMatchCharLength: 3,
            includeScore: true,
          }),
        );
      }
      this.logger.log('Fuse instances initialized');
    }

    if (!Classifier.bayesTrained) {
      Classifier.bayesClassifier = new natural.BayesClassifier();
      for (const [category, keywords] of Object.entries(EXPENSE_KEYWORDS)) {
        for (const keyword of keywords) {
          Classifier.bayesClassifier.addDocument(keyword, category);
        }
      }
      Classifier.bayesClassifier.train();
      Classifier.bayesTrained = true;
      this.logger.log('Bayes classifier trained');
    }
  }

  /**
   * Charge les règles dynamiques depuis Redis (persistance des corrections globales)
   */
  private async loadGlobalRules(): Promise<void> {
    try {
      const rules = await this.redisService.get('classifier:global_rules');
      if (rules) {
        Classifier.globalRules = JSON.parse(rules);
        this.logger.log(
          `${Object.keys(Classifier.globalRules).length} global rules loaded from Redis`,
        );
      }
    } catch (e) {
      this.logger.warn('Failed to load global rules', e);
    }
  }

  /**
   * Classification avec cache et règles globales
   */
  async categorizeWithCache(
    description: string,
    customerId?: string,
  ): Promise<ExpenseCategory> {
    if (!description || description.trim().length === 0)
      return ExpenseCategory.DIVERS;
    const desc = description.toUpperCase().trim();

    // PRIORITÉ 1 : Règle Globale (Correction admin qui s'applique à tout le monde)
    if (Classifier.globalRules[desc]) {
      return Classifier.globalRules[desc];
    }

    // PRIORITÉ 2 : Cache personnel Redis (Correction spécifique à un client)
    if (customerId) {
      const cached = await this.getFromUserCache(customerId, desc);
      if (cached) return cached;
    }

    // PRIORITÉ 3 : Dictionnaire Statique (Dossier config)
    const exactResult = this.matchExact(desc);
    if (exactResult !== ExpenseCategory.DIVERS) return exactResult;

    // PRIORITÉ 4 : Intelligence Artificielle (Fuzzy + Bayes)
    const aiResult = this.matchAI(desc);

    // Sauvegarder le résultat IA en cache pour la prochaine fois
    if (customerId && aiResult !== ExpenseCategory.DIVERS) {
      await this.saveToUserCache(customerId, desc, aiResult);
    }

    return aiResult;
  }

  /**
   * Catégorie d'une écriture : préfère la catégorie précalculée
   * (ex. SMS Mobile Money arbitrés par CamenBert), sinon classifier.
   */
  async categorizeEntry(
    entry: Pick<Entry, 'transaction'>,
    customerId?: string,
  ): Promise<ExpenseCategory> {
    const stored = entry.transaction?.category;
    if (stored) return stored as ExpenseCategory;
    return this.categorizeWithCache(
      entry.transaction?.description ?? '',
      customerId,
    );
  }

  private matchExact(desc: string): ExpenseCategory {
    const scores = new Map<ExpenseCategory, number>();
    for (const [category, keywords] of Object.entries(EXPENSE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (desc.includes(keyword.toUpperCase())) {
          scores.set(
            category as ExpenseCategory,
            (scores.get(category as ExpenseCategory) || 0) +
              10 +
              keyword.length,
          );
        }
      }
    }
    if (scores.size === 0) return ExpenseCategory.DIVERS;
    return Array.from(scores.entries()).reduce((p, c) =>
      c[1] > p[1] ? c : p,
    )[0];
  }

  private matchAI(desc: string): ExpenseCategory {
    // 1. Fuzzy Matching (Fuse.js)
    if (Classifier.fuseInstances) {
      const words = desc.split(/\s+/).filter((w) => w.length >= 3);
      const scores = new Map<ExpenseCategory, number>();
      for (const [category, fuse] of Classifier.fuseInstances.entries()) {
        for (const word of words) {
          const results = fuse.search(word);
          if (results.length > 0 && 1 - results[0].score! > 0.65) {
            scores.set(
              category,
              (scores.get(category) || 0) + (1 - results[0].score!) * 10,
            );
          }
        }
      }
      if (scores.size > 0) {
        const winner = Array.from(scores.entries()).reduce((p, c) =>
          c[1] > p[1] ? c : p,
        );
        if (winner[1] >= 4) return winner[0];
      }
    }

    // 2. Embedding similarity (si les embeddings sont chargés)
    if (this.embeddingClassifier?.isReady()) {
      const result = this.embeddingClassifier.classify(desc);
      if (result) {
        return result.category;
      }
    }

    // 3. Bayes (fallback)
    if (Classifier.bayesTrained && Classifier.bayesClassifier) {
      try {
        return (
          (Classifier.bayesClassifier.classify(desc) as ExpenseCategory) ??
          ExpenseCategory.DIVERS
        );
      } catch {
        return ExpenseCategory.DIVERS;
      }
    }

    return ExpenseCategory.DIVERS;
  }

  /**
   * Enregistre une correction.
   * Elle devient une RÈGLE GLOBALE pour tout le système.
   */
  /**
   * Teste toutes les méthodes de classification et retourne les scores détaillés.
   * Utilisé par l'interface admin.
   */
  testAll(description: string): {
    exact: { category: ExpenseCategory; score: number } | null;
    fuse: { category: ExpenseCategory; score: number } | null;
    embedding: ScoredCategory | null;
    embeddingTop3: ScoredCategory[];
    bayes: ExpenseCategory | null;
    winner: ExpenseCategory;
  } {
    const desc = description.toUpperCase().trim();

    // Exact
    const exact = this.matchExact(desc);
    const exactResult =
      exact !== ExpenseCategory.DIVERS ? { category: exact, score: 10 } : null;

    // Fuse
    let fuseResult: { category: ExpenseCategory; score: number } | null = null;
    if (Classifier.fuseInstances) {
      const words = desc.split(/\s+/).filter((w) => w.length >= 3);
      const scores = new Map<ExpenseCategory, number>();
      for (const [category, fuse] of Classifier.fuseInstances.entries()) {
        for (const word of words) {
          const results = fuse.search(word);
          if (results.length > 0 && 1 - results[0].score! > 0.65) {
            scores.set(
              category,
              (scores.get(category) || 0) + (1 - results[0].score!) * 10,
            );
          }
        }
      }
      if (scores.size > 0) {
        const winner = Array.from(scores.entries()).reduce((p, c) =>
          c[1] > p[1] ? c : p,
        );
        fuseResult = { category: winner[0], score: winner[1] };
      }
    }

    // Embedding
    let embeddingResult: ScoredCategory | null = null;
    let embeddingTop3: ScoredCategory[] = [];
    if (this.embeddingClassifier?.isReady()) {
      embeddingResult = this.embeddingClassifier.classify(desc, 0);
      embeddingTop3 = this.embeddingClassifier.topN(desc, 3);
    }

    // Bayes
    let bayesResult: ExpenseCategory | null = null;
    if (Classifier.bayesTrained && Classifier.bayesClassifier) {
      try {
        bayesResult = Classifier.bayesClassifier.classify(
          desc,
        ) as ExpenseCategory;
      } catch {
        bayesResult = null;
      }
    }

    // Winner : priorité exact > fuse > embedding > bayes > DIVERS
    const winner =
      exactResult?.category ??
      fuseResult?.category ??
      embeddingResult?.category ??
      bayesResult ??
      ExpenseCategory.DIVERS;

    return {
      exact: exactResult,
      fuse: fuseResult,
      embedding: embeddingResult,
      embeddingTop3,
      bayes: bayesResult,
      winner,
    };
  }

  async recordFeedback(
    customerId: string,
    description: string,
    actualCategory: string,
  ): Promise<void> {
    const desc = description.toUpperCase().trim();
    const category = actualCategory as ExpenseCategory;

    Classifier.globalRules[desc] = category;
    await this.redisService.set(
      'classifier:global_rules',
      JSON.stringify(Classifier.globalRules),
      3600,
    );

    // 2. Supprimer les anciens caches contradictoires pour ce client
    const hash = this.hashString(desc);
    await this.redisService.delete(`classifier:${customerId}:${hash}`);

    // 3. Apprentissage Bayes (Global)
    if (Classifier.bayesClassifier) {
      Classifier.bayesClassifier.addDocument(desc, category);
      Classifier.bayesClassifier.train();
    }

    this.logger.log(
      `Feedback GLOBAL enregistré : "${desc}" → ${actualCategory}`,
    );
  }

  async isDebt(description: string, customerId?: string): Promise<boolean> {
    if (!description) return false;
    const category = await this.categorizeWithCache(description, customerId);
    return category === ExpenseCategory.CREDIT;
  }

  static interpretRatio(ratio: number) {
    if (ratio < 50)
      return {
        ratioLabel: 'EXCELLENT',
        score: 100,
        interpretation: `Excellent ! (${ratio}%)`,
      };
    if (ratio < 75)
      return {
        ratioLabel: 'SAIN',
        score: 75,
        interpretation: `Budget équilibré (${ratio}%)`,
      };
    if (ratio < 90)
      return {
        ratioLabel: 'ATTENTION',
        score: 50,
        interpretation: `Prudence recommandée (${ratio}%)`,
      };
    return {
      ratioLabel: 'CRITIQUE',
      score: 10,
      interpretation: `Surendettement (${ratio}%)`,
    };
  }

  private async getFromUserCache(
    customerId: string,
    desc: string,
  ): Promise<ExpenseCategory | null> {
    const hash = this.hashString(desc);
    const cached = await this.redisService.get(
      `classifier:${customerId}:${hash}`,
    );
    return cached as ExpenseCategory | null;
  }

  private async saveToUserCache(
    customerId: string,
    desc: string,
    category: ExpenseCategory,
  ): Promise<void> {
    const hash = this.hashString(desc);
    await this.redisService.set(
      `classifier:${customerId}:${hash}`,
      category,
      30 * 24 * 60 * 60,
    );
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}
