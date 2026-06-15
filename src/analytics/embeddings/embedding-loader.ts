import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

export const EMBEDDING_DIM = 300;

/**
 * Nombre maximum de mots chargés depuis le fichier .vec.
 * Le fichier contient ~2M mots (2.4GB RAM), on se limite
 * aux 50 000 plus fréquents (~60MB) pour éviter l'explosion mémoire.
 * Les mots sont triés par fréquence décroissante dans le fichier.
 */
export const MAX_EMBEDDING_WORDS = 50_000;

const DEFAULT_PATH = resolve(process.cwd(), 'data/embeddings/cc.fr.300.vec');

@Injectable()
export class EmbeddingLoader implements OnApplicationBootstrap {
  private vectors: Map<string, Float32Array> = new Map();
  private loaded = false;

  async onApplicationBootstrap(): Promise<void> {
    await this.load();
  }

  async load(filePath?: string): Promise<void> {
    const path = filePath ?? DEFAULT_PATH;

    if (!existsSync(path)) {
      console.warn(`[Embeddings] Fichier non trouvé : ${path}`);
      console.warn(
        '[Embeddings] Lance scripts/download-embeddings.sh pour télécharger.',
      );
      console.warn(
        '[Embeddings] Le système fonctionne sans embeddings (mode 21 features).',
      );
      return;
    }

    return new Promise((resolvePromise, reject) => {
      const stream = createReadStream(path, { encoding: 'utf-8' });
      const rl = createInterface({ input: stream, crlfDelay: Infinity });
      let lineCount = 0;
      let headerParsed = false;

      // ── Barre de progression ──
      let totalLines = 0;
      let progressChars = 0;
      const barWidth = 30;

      try {
        // Estimer la taille totale à partir du nombre de lignes
        const fileSize = statSync(path).size;
        const sampleLine = ' '.repeat(EMBEDDING_DIM * 6).length; // estimation (~1800 bytes/ligne)
        totalLines = Math.floor(fileSize / sampleLine);
      } catch {
        totalLines = 2_000_000; // fallback si stat échoue
      }

      process.stdout.write('\n');
      process.stdout.write(
        `  ⏳ Embeddings : 0/${totalLines.toLocaleString()} lignes`,
      );

      const drawProgress = (current: number) => {
        const total =
          current > MAX_EMBEDDING_WORDS
            ? MAX_EMBEDDING_WORDS
            : Math.min(totalLines, MAX_EMBEDDING_WORDS);
        const pct = Math.min((current / total) * 100, 100);
        const filled = Math.floor((pct / 100) * barWidth);

        if (filled !== progressChars) {
          progressChars = filled;
          const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
          process.stdout.write(
            `\r  📦 [${bar}] ${pct.toFixed(0)}% (${current.toLocaleString()} mots)`,
          );
        }
      };

      rl.on('line', (line: string) => {
        if (!headerParsed) {
          headerParsed = true;

          // Déduire le nombre total de lignes depuis l'entête
          const headerParts = line.split(' ');
          if (headerParts.length >= 2) {
            totalLines = Math.min(
              parseInt(headerParts[0] ?? '2000000', 10),
              2_000_000,
            );
          }
          drawProgress(0);
          return;
        }

        // Limite atteinte
        if (lineCount >= MAX_EMBEDDING_WORDS) {
          stream.destroy();
          rl.close();
          return;
        }

        const spaceIdx = line.indexOf(' ');
        if (spaceIdx === -1) return;

        const word = line.slice(0, spaceIdx);
        const valuesStr = line.slice(spaceIdx + 1);
        const values = valuesStr.split(' ');

        if (values.length !== EMBEDDING_DIM) return;

        const arr = new Float32Array(EMBEDDING_DIM);
        for (let i = 0; i < EMBEDDING_DIM; i++) {
          arr[i] = parseFloat(values[i] ?? '0');
        }

        this.vectors.set(word, arr);
        lineCount++;

        if (lineCount % 1000 === 0) {
          drawProgress(lineCount);
        }
      });

      rl.on('close', () => {
        this.loaded = true;
        drawProgress(lineCount);
        process.stdout.write(' ✅\n\n');
        console.log(
          `  → ${lineCount.toLocaleString()} mots chargés (${EMBEDDING_DIM}d)`,
        );
        resolvePromise();
      });

      rl.on('error', reject);
    });
  }

  getVector(word: string): Float32Array | undefined {
    return this.vectors.get(word);
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  vocabSize(): number {
    return this.vectors.size;
  }
}
