import { Logger, Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { EXPENSE_KEYWORDS, ExpenseCategory } from '../config/expense-keywords';
import Fuse from 'fuse.js';
import * as natural from 'natural';

@Injectable()
export class Classifier {
  private readonly logger = new Logger(Classifier.name);

  //  Fuse instance (fuzzy matching)
  private static fuseInstances: Map<ExpenseCategory, Fuse<string>> | null =
    null;

  //  Bayes classifier (natural)
  private static bayesClassifier: natural.BayesClassifier | null = null;
  private static bayesTrained = false;

  constructor(private redisService: RedisService) {
    Classifier.initFuse();
    Classifier.initBayes();
  }

  /**
   * Initialise un index Fuse par catégorie
   * Une seule fois au démarrage
   */
  private static initFuse(): void {
    if (Classifier.fuseInstances) return;

    Classifier.fuseInstances = new Map();

    for (const [category, keywords] of Object.entries(EXPENSE_KEYWORDS)) {
      if (keywords.length === 0) continue;

      Classifier.fuseInstances.set(
        category as ExpenseCategory,
        new Fuse(keywords, {
          threshold: 0.35, // 0 = exact, 1 = tout accepter
          distance: 80, // distance max de recherche
          minMatchCharLength: 3,
          includeScore: true,
        }),
      );
    }

    Logger.log('Fuse instances initialized', 'Classifier');
  }

  /**
   * Entraîne le classifieur Bayes avec les keywords existants
   * Une seule fois au démarrage
   */
  private static initBayes(): void {
    if (Classifier.bayesTrained) return;

    Classifier.bayesClassifier = new natural.BayesClassifier();

    for (const [category, keywords] of Object.entries(EXPENSE_KEYWORDS)) {
      if (keywords.length === 0) continue;

      // Chaque keyword devient un exemple d'entraînement
      for (const keyword of keywords) {
        Classifier.bayesClassifier.addDocument(keyword, category);
      }

      // Phrases composées pour enrichir l'entraînement
      if (keywords.length >= 3) {
        const combined = keywords.slice(0, 5).join(' ');
        Classifier.bayesClassifier.addDocument(combined, category);
      }
    }

    Classifier.bayesClassifier.train();
    Classifier.bayesTrained = true;

    Logger.log('Bayes classifier trained', 'Classifier');
  }

  // ──────────────────────────────────────────────────────────
  // MÉTHODE PRINCIPALE — Pipeline 3 niveaux
  // ──────────────────────────────────────────────────────────

  /**
   * Classification statique — pipeline complet sans cache
   * Niveau 1 → Score exact
   * Niveau 2 → Fuzzy matching (Fuse.js)
   * Niveau 3 → Bayes (Natural)
   */
  categorize(description: string): ExpenseCategory {
    if (!description || description.trim().length === 0) {
      return ExpenseCategory.DIVERS;
    }

    const desc = description.toUpperCase().trim();

    // Niveau 1  Score exact (le plus rapide)
    const exactResult = Classifier.matchExact(desc);
    if (exactResult !== ExpenseCategory.DIVERS) {
      return exactResult;
    }

    // Niveau 2  Fuzzy matching
    const fuzzyResult = Classifier.matchFuzzy(desc);
    if (fuzzyResult !== ExpenseCategory.DIVERS) {
      return fuzzyResult;
    }

    // Niveau 3  Bayes classifier
    const bayesResult = Classifier.matchBayes(desc);
    if (bayesResult !== ExpenseCategory.DIVERS) {
      return bayesResult;
    }

    return ExpenseCategory.DIVERS;
  }

  /**
   * Classification avec cache Redis — pour les appels fréquents
   */
  async categorizeWithCache(
    description: string,
    customerId?: string,
  ): Promise<ExpenseCategory> {
    if (!description || description.trim().length === 0) {
      return ExpenseCategory.DIVERS;
    }

    const desc = description.toUpperCase().trim();

    // Cache personnel Redis
    if (customerId) {
      const cached = await this.getFromUserCache(customerId, desc);
      if (cached) {
        this.logger.debug(`Cache hit: "${desc}" → ${cached}`);
        return cached;
      }
    }

    // Pipeline de classification
    const category = this.categorize(desc);

    // Sauvegarder en cache
    if (customerId) {
      await this.saveToUserCache(customerId, desc, category);
    }

    return category;
  }

  private static matchExact(desc: string): ExpenseCategory {
    const scores = new Map<ExpenseCategory, number>();

    for (const [category, keywords] of Object.entries(EXPENSE_KEYWORDS)) {
      let score = 0;

      for (const keyword of keywords) {
        if (desc.includes(keyword)) {
          // Plus le keyword est long = plus spécifique = plus de poids
          score += 10 + keyword.length;
        }
      }

      if (score > 0) {
        scores.set(category as ExpenseCategory, score);
      }
    }

    if (scores.size === 0) return ExpenseCategory.DIVERS;

    return Array.from(scores.entries()).reduce((prev, current) =>
      current[1] > prev[1] ? current : prev,
    )[0];
  }

  // ──────────────────────────────────────────────────────────
  // NIVEAU 2 — Fuzzy matching avec Fuse.js
  // ──────────────────────────────────────────────────────────

  /**
   * Découpe la description en mots et cherche chaque mot
   * dans les index Fuse de chaque catégorie
   */
  private static matchFuzzy(desc: string): ExpenseCategory {
    if (!Classifier.fuseInstances) return ExpenseCategory.DIVERS;

    // Découper en mots (chaque mot cherché séparément)
    const words = desc.split(/\s+/).filter((w) => w.length >= 3);

    const scores = new Map<ExpenseCategory, number>();

    for (const [category, fuse] of Classifier.fuseInstances.entries()) {
      let totalScore = 0;

      for (const word of words) {
        const results = fuse.search(word);

        if (results.length > 0 && results[0].score !== undefined) {
          // Fuse score : 0 = parfait, 1 = mauvais
          // On inverse : 1 = parfait, 0 = mauvais
          const quality = 1 - results[0].score;

          // On ne garde que les matches de qualité suffisante
          if (quality > 0.65) {
            totalScore += quality * 10;
          }
        }
      }

      if (totalScore > 0) {
        scores.set(category, totalScore);
      }
    }

    if (scores.size === 0) return ExpenseCategory.DIVERS;

    const winner = Array.from(scores.entries()).reduce((prev, current) =>
      current[1] > prev[1] ? current : prev,
    );

    // Seuil minimum de confiance
    if (winner[1] < 4) return ExpenseCategory.DIVERS;

    return winner[0];
  }

  /**
   * Utilise le classifieur Bayes entraîné sur les keywords
   */
  private static matchBayes(desc: string): ExpenseCategory {
    if (!Classifier.bayesClassifier || !Classifier.bayesTrained) {
      return ExpenseCategory.DIVERS;
    }

    try {
      const result = Classifier.bayesClassifier.classify(desc);
      return (result as ExpenseCategory) ?? ExpenseCategory.DIVERS;
    } catch {
      return ExpenseCategory.DIVERS;
    }
  }

  // ──────────────────────────────────────────────────────────
  // UTILITAIRES EXISTANTS
  // ──────────────────────────────────────────────────────────

  async isDebt(description: string, customerId?: string): Promise<boolean> {
    if (!description) return false;
    const category = await this.categorizeWithCache(description, customerId);
    if (category === ExpenseCategory.CREDIT) return true;

    const desc = description.toUpperCase();
    return (
      desc.includes('PRET') ||
      desc.includes('PRÊT') ||
      desc.includes('REMBOURSEMENT') ||
      desc.includes('ECHEANCE') ||
      desc.includes('ÉCHÉANCE')
    );
  }

  static interpretRatio(ratio: number) {
    let ratioLabel: string;
    let score: number;
    let interpretation: string;

    if (ratio < 50) {
      ratioLabel = 'EXCELLENT';
      score = 100;
      interpretation = `Excellent ! Vous ne dépensez que ${ratio}% de vos revenus.`;
    } else if (ratio < 75) {
      ratioLabel = 'SAIN';
      score = 75;
      interpretation = `Votre budget est équilibré, vous dépensez ${ratio}% de vos revenus.`;
    } else if (ratio < 90) {
      ratioLabel = 'ATTENTION';
      score = 50;
      interpretation = `Vous dépensez ${ratio}% de vos revenus ce mois. Pensez à réduire vos dépenses variables.`;
    } else if (ratio <= 100) {
      ratioLabel = 'PRUDENCE';
      score = 25;
      interpretation = `Attention, vos dépenses (${ratio}%) absorbent la quasi-totalité de vos revenus.`;
    } else {
      ratioLabel = 'CRITIQUE';
      score = 0;
      interpretation = `Critique : Vos dépenses (${ratio}%) dépassent vos revenus. Vous êtes en situation de surendettement.`;
    }

    return { ratioLabel, score, interpretation };
  }

  async recordFeedback(
    customerId: string,
    description: string,
    actualCategory: ExpenseCategory,
  ): Promise<void> {
    const hash = this.hashString(description);
    const key = `classifier:${customerId}:${hash}`;

    await this.redisService.set(key, actualCategory, 30 * 24 * 60 * 60);

    // Bonus — réentraîner Bayes avec ce feedback
    if (Classifier.bayesClassifier) {
      Classifier.bayesClassifier.addDocument(
        description.toUpperCase(),
        actualCategory,
      );
      Classifier.bayesClassifier.train();
    }

    this.logger.log(`Feedback recorded: "${description}" → ${actualCategory}`);
  }

  private async getFromUserCache(
    customerId: string,
    desc: string,
  ): Promise<ExpenseCategory | null> {
    try {
      const hash = this.hashString(desc);
      const key = `classifier:${customerId}:${hash}`;
      const cached = await this.redisService.get(key);
      return cached as ExpenseCategory | null;
    } catch (error) {
      this.logger.warn(`Redis get failed: ${error.message}`);
      return null;
    }
  }

  private async saveToUserCache(
    customerId: string,
    desc: string,
    category: ExpenseCategory,
  ): Promise<void> {
    try {
      const hash = this.hashString(desc);
      const key = `classifier:${customerId}:${hash}`;
      await this.redisService.set(key, category, 30 * 24 * 60 * 60);
    } catch (error) {
      this.logger.warn(`Redis set failed: ${error.message}`);
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}
