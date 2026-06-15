import { Injectable } from '@nestjs/common';
import { EmbeddingLoader, EMBEDDING_DIM } from './embedding-loader';

@Injectable()
export class TextVectorizer {
  constructor(private readonly loader: EmbeddingLoader) {}

  /**
   * Moyenne des embeddings de tous les mots dans les descriptions données.
   * Si aucune description ou embeddings non chargés, retourne un vecteur nul.
   */
  average(descriptions: string[]): Float32Array {
    const result = new Float32Array(EMBEDDING_DIM);
    if (!this.loader.isLoaded() || descriptions.length === 0) return result;

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
