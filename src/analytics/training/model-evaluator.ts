import type { WeightMatrix, ScoredIntent } from '../matrix/types';
import { buildFeatureVector } from '../matrix/context-vector.builder';
import { computeScores, selectActiveIntents } from '../matrix/scoring-engine';
import type { TrainingExample } from './types';

export type EvaluationReport = {
  total: number;
  accuracy: number;
  top3Accuracy: number;
  confusionMatrix: Record<string, Record<string, number>>;
  errors: Array<{
    id: string;
    category: string;
    expected: string;
    predicted: string;
    scores: ScoredIntent[];
  }>;
};

export function evaluate(
  examples: TrainingExample[],
  W: WeightMatrix,
): EvaluationReport {
  const confusionMatrix: Record<string, Record<string, number>> = {};
  const errors: EvaluationReport['errors'] = [];
  let correct = 0;
  let top3 = 0;

  for (const ex of examples) {
    const vector = buildFeatureVector(ex.context);
    const scores = computeScores(vector, W);
    const sorted = selectActiveIntents(scores, -Infinity);
    const predicted = sorted[0]?.kind ?? 'NONE';

    if (!confusionMatrix[ex.expected]) confusionMatrix[ex.expected] = {};
    confusionMatrix[ex.expected][predicted] =
      (confusionMatrix[ex.expected][predicted] ?? 0) + 1;

    if (predicted === ex.expected) correct++;

    const inTop3 = sorted.slice(0, 3).some((s) => s.kind === ex.expected);
    if (inTop3) top3++;

    if (predicted !== ex.expected) {
      errors.push({
        id: ex.id,
        category: ex.context.category,
        expected: ex.expected,
        predicted,
        scores: sorted.slice(0, 5),
      });
    }
  }

  return {
    total: examples.length,
    accuracy: examples.length > 0 ? (correct / examples.length) * 100 : 0,
    top3Accuracy: examples.length > 0 ? (top3 / examples.length) * 100 : 0,
    confusionMatrix,
    errors,
  };
}

export function printReport(report: EvaluationReport): void {
  console.log('\n═══════════════════════════════════════');
  console.log("  RAPPORT D'ÉVALUATION");
  console.log('═══════════════════════════════════════');
  console.log(`  Total exemples : ${report.total}`);
  console.log(`  Accuracy        : ${report.accuracy.toFixed(1)}%`);
  console.log(`  Top-3 Accuracy  : ${report.top3Accuracy.toFixed(1)}%`);
  console.log(`  Erreurs         : ${report.errors.length}`);
  console.log('───────────────────────────────────────');

  if (report.errors.length > 0 && report.errors.length <= 20) {
    console.log('\n  Erreurs :');
    for (const err of report.errors) {
      console.log(
        `    ${err.id} | ${err.category} | attendu: ${err.expected} | prédit: ${err.predicted}`,
      );
    }
  } else if (report.errors.length > 20) {
    console.log(
      `\n  (${report.errors.length} erreurs — trop nombreuses à afficher)`,
    );
  }

  console.log('');
}
