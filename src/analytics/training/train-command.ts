import { Injectable } from '@nestjs/common';
import { loadAndSplit } from './data-loader';
import { trainSingleLayer, trainTwoLayer } from './gradient-descent';
import { evaluate, evaluateTwoLayer, printReport } from './model-evaluator';
import {
  buildWeightMatrix,
  buildWeightMatricesDeep,
} from '../matrix/intent-matrix';
import type { TrainingConfig, TrainingResult } from './types';
import { DEFAULT_TRAINING_CONFIG } from './types';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

@Injectable()
export class TrainCommand {
  async run(overrides?: Partial<TrainingConfig>): Promise<TrainingResult> {
    const config: TrainingConfig = { ...DEFAULT_TRAINING_CONFIG, ...overrides };

    console.log('\n═══════════════════════════════════════');
    console.log('  ENTRAÎNEMENT DE LA MATRICE DES POIDS');
    console.log('═══════════════════════════════════════');
    console.log(`  Époques       : ${config.epochs}`);
    console.log(`  Learning rate : ${config.learningRate}`);
    console.log(`  Marge         : ${config.margin}`);
    console.log(`  Couches       : ${config.layers}`);
    console.log(`  Données       : ${config.dataFile}`);
    console.log('───────────────────────────────────────\n');

    const { train, val, test } = loadAndSplit(config.dataFile);
    if (train.length === 0) {
      console.log(
        "Aucun exemple d'entraînement. Ajoute des données dans training-data.json",
      );
      console.log('Format attendu :');
      console.log(
        JSON.stringify(
          [
            {
              id: 'ex-001',
              context: {
                category: 'LOGEMENT',
                percent: 55,
                change: 10,
                amount: 150000,
                expenseRatio: 75,
                prevAmount: 120000,
                totalRevenue: 300000,
                totalExpenses: 200000,
                label: 'Logement',
              },
              expected: 'LOGEMENT_CRITICAL',
            },
          ],
          null,
          2,
        ),
      );
      return {
        config,
        metrics: [],
        finalAccuracy: 0,
        W1: [],
        W2: null,
      };
    }

    let metrics;
    let finalAccuracy: number;

    if (config.layers === 2) {
      const { W1: initW1, W2: initW2 } = buildWeightMatricesDeep();
      const result = trainTwoLayer(
        train,
        initW1,
        initW2,
        config.epochs,
        config.learningRate,
        config.margin,
        config.lambda,
        val,
        config.patience,
      );

      console.log('\n── Évaluation sur l\'ensemble de validation ──');
      const valReport = evaluateTwoLayer(val, result.W1, result.W2);
      printReport(valReport);

      console.log('\n── Évaluation sur l\'ensemble de test (hold-out) ──');
      const testReport = evaluateTwoLayer(test, result.W1, result.W2);
      printReport(testReport);
      finalAccuracy = testReport.accuracy;
      metrics = result.metrics;

      this.saveMatricesDeep(result.W1, result.W2);

      return {
        config,
        metrics,
        finalAccuracy,
        W1: result.W1,
        W2: result.W2,
      };
    } else {
      const initialMatrix = buildWeightMatrix();
      const result = trainSingleLayer(
        train,
        initialMatrix,
        config.epochs,
        config.learningRate,
        config.margin,
        config.lambda,
        val,
        config.patience,
      );

      console.log('\n── Évaluation sur l\'ensemble de validation ──');
      const valReport = evaluate(val, result.W);
      printReport(valReport);

      console.log('\n── Évaluation sur l\'ensemble de test (hold-out) ──');
      const testReport = evaluate(test, result.W);
      printReport(testReport);
      finalAccuracy = testReport.accuracy;
      metrics = result.metrics;

      this.saveMatrix(result.W);

      return {
        config,
        metrics,
        finalAccuracy,
        W1: result.W,
        W2: null,
      };
    }
  }

  private saveMatrix(W: number[][]): void {
    const rows = W.map(
      (row) => `  [${row.map((v) => v.toFixed(4)).join(', ')}]`,
    );
    const content = `// Poids entraînés — généré automatiquement le ${new Date().toISOString()}
// Dimensions : ${W.length} features × ${W[0]?.length ?? 0} intentions
export const TRAINED_WEIGHTS: number[][] = [
${rows.join(',\n')}
];\n`;

    const path = resolve(
      process.cwd(),
      'src/analytics/matrix/trained-weights.ts',
    );
    writeFileSync(path, content);
    console.log(`\n✅ Poids sauvegardés dans ${path}`);
  }

  private saveMatricesDeep(W1: number[][], W2: number[][]): void {
    const rows1 = W1.map(
      (row) => `  [${row.map((v) => v.toFixed(4)).join(', ')}]`,
    );
    const rows2 = W2.map(
      (row) => `  [${row.map((v) => v.toFixed(4)).join(', ')}]`,
    );
    const content = `// Poids entraînés (2 couches) — généré automatiquement le ${new Date().toISOString()}
// W1 : ${W1.length} × ${W1[0]?.length ?? 0}
export const TRAINED_W1: number[][] = [
${rows1.join(',\n')}
];

// W2 : ${W2.length} × ${W2[0]?.length ?? 0}
export const TRAINED_W2: number[][] = [
${rows2.join(',\n')}
];\n`;

    const path = resolve(
      process.cwd(),
      'src/analytics/matrix/trained-weights.ts',
    );
    writeFileSync(path, content);
    console.log(`\n✅ Poids (2 couches) sauvegardés dans ${path}`);
  }
}
