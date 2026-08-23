import { Injectable } from '@nestjs/common';
import { EmbeddingLoader, EMBEDDING_DIM } from './embedding-loader';

@Injectable()
export class TextVectorizer {
  private idfWeights: Map<string, number> = new Map();
  private fitted = false;

  constructor(private readonly loader: EmbeddingLoader) {}

  /**
   * Entraîne les poids IDF à partir d'un corpus de descriptions.
   * Les mots rares reçoivent un poids plus élevé.
   */
  fit(descriptions: string[]): void {
    const N = descriptions.length;
    if (N === 0) return;
    this.idfWeights.clear();

    const df = new Map<string, number>();
    for (const desc of descriptions) {
      const tokens = new Set(this.tokenize(desc));
      for (const token of tokens) {
        df.set(token, (df.get(token) ?? 0) + 1);
      }
    }

    for (const [word, count] of df) {
      this.idfWeights.set(word, Math.log(N / count) + 1);
    }

    this.fitted = true;
  }

  /**
   * Moyenne des embeddings de tous les mots dans les descriptions données.
   * Si `fit()` a été appelé, utilise une moyenne pondérée par IDF.
   * Sinon, utilise la moyenne arithmétique simple (fallback).
   * Si aucune description ou embeddings non chargés, retourne un vecteur nul.
   */
  average(descriptions: string[]): Float32Array {
    const result = new Float32Array(EMBEDDING_DIM);
    if (!this.loader.isLoaded() || descriptions.length === 0) return result;

    if (this.fitted) {
      let totalWeight = 0;
      for (const desc of descriptions) {
        const words = this.tokenize(desc);
        for (const word of words) {
          const vec = this.loader.getVector(word);
          const weight = this.idfWeights.get(word) ?? 1;
          if (vec) {
            for (let i = 0; i < EMBEDDING_DIM; i++) {
              result[i] += vec[i] * weight;
            }
            totalWeight += weight;
          }
        }
      }
      if (totalWeight > 0) {
        for (let i = 0; i < EMBEDDING_DIM; i++) {
          result[i] /= totalWeight;
        }
      }
    } else {
      let wordCount = 0;
      for (const desc of descriptions) {
        const words = this.tokenize(desc);
        for (const word of words) {
          const vec = this.loader.getVector(word);
          if (vec) {
            for (let i = 0; i < EMBEDDING_DIM; i++) {
              result[i] += vec[i];
            }
            wordCount++;
          }
        }
      }
      if (wordCount > 0) {
        for (let i = 0; i < EMBEDDING_DIM; i++) {
          result[i] /= wordCount;
        }
      }
    }

    return result;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-zàâçéèêëîïôûùüÿñæœ0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
  }
}
