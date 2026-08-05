import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { EmbeddingLoader } from '../analytics/embeddings/embedding-loader';
import { TextVectorizer } from '../analytics/embeddings/text-vectorizer';
import fragments from './catalog-fragments.json';

type FragmentSlot = keyof typeof fragments.observations & keyof typeof fragments.interpretations & keyof typeof fragments.recommendations & keyof typeof fragments.encouragements;

type FragmentGroup = {
  templates: string[];
  conditions?: Record<string, string[]>;
};

type FragmentCatalog = {
  observations: Record<string, FragmentGroup>;
  interpretations: Record<string, FragmentGroup>;
  recommendations: Record<string, FragmentGroup>;
  encouragements: Record<string, FragmentGroup>;
};

const catalog = fragments as unknown as FragmentCatalog;

const ALL_SLOTS = {
  observations: catalog.observations,
  interpretations: catalog.interpretations,
  recommendations: catalog.recommendations,
  encouragements: catalog.encouragements,
};

/**
 * Sélectionne la meilleure variante d'un fragment donné.
 *
 * Utilise la similarité cosinus entre l'embedding du template
 * et le contexte (catégorie+sévérité) pour choisir la variante
 * la plus pertinente.
 *
 * Fallback : hash-based si les embeddings ne sont pas chargés.
 */
@Injectable()
export class FragmentSelector implements OnApplicationBootstrap {
  private readonly logger = new Logger(FragmentSelector.name);
  private variantEmbeddings: Map<string, Float32Array[]> = new Map();
  private ready = false;

  constructor(
    private readonly loader: EmbeddingLoader,
    private readonly vectorizer: TextVectorizer,
  ) {}

  onApplicationBootstrap() {
    this.precomputeEmbeddings();
  }

  private precomputeEmbeddings() {
    if (!this.loader.isLoaded()) {
      this.logger.warn('Embeddings non chargés — sélection hash-based');
      this.ready = true;
      return;
    }

    let count = 0;
    for (const [groupName, group] of Object.entries(ALL_SLOTS)) {
      for (const [slot, frag] of Object.entries(group)) {
        const key = `${groupName}.${slot}`;
        const embs: Float32Array[] = [];
        for (const tpl of frag.templates) {
          const desc = tpl.replace(/\{[^}]+\}/g, '').trim();
          if (desc) {
            embs.push(this.vectorizer.average([desc]));
          }
        }
        if (embs.length > 0) {
          this.variantEmbeddings.set(key, embs);
          count += embs.length;
        }
      }
    }
    this.ready = true;
    this.logger.log(`${count} variantes de fragments encodées`);
  }

  /**
   * Sélectionne une variante de template pour un slot donné.
   * @param fragmentSlot ex: "observations.spike"
   * @param contextQuery mots-clés décrivant le contexte (catégorie, sévérité...)
   */
  select(
    fragmentSlot: string,
    contextQuery?: string,
  ): string {
    const [groupName, slotName] = fragmentSlot.split('.');
    const group = (ALL_SLOTS as any)[groupName ?? ''];
    const frag: FragmentGroup | undefined = group?.[slotName ?? ''];
    if (!frag || frag.templates.length === 0) return '';

    const variants = frag.templates;

    // Embedding-based selection
    if (this.loader.isLoaded() && contextQuery) {
      const key = fragmentSlot;
      const embs = this.variantEmbeddings.get(key);
      if (embs && embs.length === variants.length) {
        const contextEmb = this.vectorizer.average([contextQuery]);
        let bestIdx = 0;
        let bestSim = -1;
        for (let i = 0; i < embs.length; i++) {
          const sim = cosineSimilarity(contextEmb, embs[i]);
          if (sim > bestSim) {
            bestSim = sim;
            bestIdx = i;
          }
        }
        return variants[bestIdx] ?? variants[0] ?? '';
      }
    }

    // Fallback hash-based
    const seed = stableHash(fragmentSlot + (contextQuery ?? ''), 0);
    return variants[seed % variants.length] ?? variants[0] ?? '';
  }
}

function stableHash(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) & 0x7fffffff;
  }
  return h;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
