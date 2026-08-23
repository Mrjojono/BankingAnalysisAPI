import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EmbeddingLoader, EMBEDDING_DIM } from './embedding-loader';
import { TextVectorizer } from './text-vectorizer';
import { EXPENSE_KEYWORDS, ExpenseCategory } from '../config/expense-keywords';

/**
 * Ajoute un score de confiance à la classification retournée.
 */
export type ScoredCategory = {
  category: ExpenseCategory;
  score: number;
};

/**
 * Classifieur basé sur la similarité cosinus entre embeddings.
 *
 * Principe : chaque catégorie (LOGEMENT, ALIMENTATION...) a un "centroid"
 * calculé en moyennant les embeddings de tous ses mots-clés.
 * Une description inconnue est classée dans la catégorie dont le centroid
 * est le plus proche (cosinus ≥ seuil).
 */
@Injectable()
export class EmbeddingClassifier implements OnApplicationBootstrap {
  private centroids: Map<string, Float32Array> = new Map();
  private ready = false;

  constructor(
    private readonly loader: EmbeddingLoader,
    private readonly vectorizer: TextVectorizer,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Attendre que les embeddings soient chargés
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.loader.isLoaded()) {
          this.buildCentroids();
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      // Si déjà chargé (EmbeddingLoader a fini avant nous)
      if (this.loader.isLoaded()) {
        this.buildCentroids();
        resolve();
      } else {
        check();
      }
    });
  }

  /**
   * Construit les centroids de chaque catégorie à partir des mots-clés.
   * Un centroid = moyenne des embeddings de tous les mots-clés de la catégorie.
   */
  private buildCentroids(): void {
    // Train TF-IDF weights from all keywords across all categories
    const allKeywords = Object.values(EXPENSE_KEYWORDS).flat();
    this.vectorizer.fit(allKeywords);

    let totalCategories = 0;
    let totalKeywordsUsed = 0;

    for (const [category, keywords] of Object.entries(EXPENSE_KEYWORDS)) {
      if (keywords.length === 0) continue;

      const vectors: Float32Array[] = [];

      for (const kw of keywords) {
        const vec = this.loader.getVector(kw.toLowerCase());
        if (vec) {
          vectors.push(vec);
        }
      }

      if (vectors.length === 0) continue;

      // Moyenne des vecteurs
      const centroid = new Float32Array(EMBEDDING_DIM);
      for (const v of vectors) {
        for (let i = 0; i < EMBEDDING_DIM; i++) {
          centroid[i] += v[i];
        }
      }
      for (let i = 0; i < EMBEDDING_DIM; i++) {
        centroid[i] /= vectors.length;
      }

      this.centroids.set(category, centroid);
      totalCategories++;
      totalKeywordsUsed += vectors.length;
    }

    this.ready = true;
    console.log(
      `[EmbeddingClassifier] ${totalCategories} centroïds construits (${totalKeywordsUsed} mots-clés).`,
    );
  }

  /**
   * Cosine similarity entre deux vecteurs.
   * Résultat : 1 = identique, 0 = orthogonal, -1 = opposé.
   */
  cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Classifie une description par similarité cosinus.
   * Retourne null si le meilleur score est en dessous du seuil.
   *
   * @param description - Texte de la transaction
   * @param threshold - Seuil de confiance (défaut: 0.5)
   */
  classify(description: string, threshold = 0.5): ScoredCategory | null {
    if (!this.ready || !description) return null;

    const descVec = this.vectorizer.average([description]);
    let best: ScoredCategory | null = null;

    for (const [category, centroid] of this.centroids.entries()) {
      const sim = this.cosineSimilarity(descVec, centroid);
      if (sim > (best?.score ?? -1)) {
        best = { category: category as ExpenseCategory, score: sim };
      }
    }

    return best && best.score >= threshold ? best : null;
  }

  /**
   * Retourne le top-N des catégories les plus proches.
   * Utile quand on veut laisser le classifieur principal départager.
   */
  topN(description: string, n = 3): ScoredCategory[] {
    if (!this.ready || !description) return [];

    const descVec = this.vectorizer.average([description]);
    const scores: ScoredCategory[] = [];

    for (const [category, centroid] of this.centroids.entries()) {
      const sim = this.cosineSimilarity(descVec, centroid);
      scores.push({ category: category as ExpenseCategory, score: sim });
    }

    return scores.sort((a, b) => b.score - a.score).slice(0, n);
  }

  isReady(): boolean {
    return this.ready;
  }
}
