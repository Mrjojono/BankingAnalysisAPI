/**
 * Calibration script for eligibility thresholds.
 *
 * Usage: npx ts-node src/eligibility/calibrate.ts <data-file.json>
 *
 * Loads historical eligibility examples and finds the optimal
 * ELIGIBLE and PARTIAL thresholds by maximizing F1 score.
 */

import { readFileSync } from 'fs';

type CalibrationExample = {
  id: string;
  scorePercent: number;
  expectedStatus: 'ELIGIBLE' | 'PARTIAL' | 'NOT_ELIGIBLE';
};

function computeF1(
  examples: CalibrationExample[],
  eligibleThreshold: number,
  partialThreshold: number,
): { f1: number; precision: number; recall: number; accuracy: number } {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  let correct = 0;

  for (const ex of examples) {
    const predicted = ex.scorePercent >= eligibleThreshold * 100
      ? 'ELIGIBLE'
      : ex.scorePercent >= partialThreshold * 100
        ? 'PARTIAL'
        : 'NOT_ELIGIBLE';

    if (predicted === ex.expectedStatus) correct++;

    if (predicted === 'ELIGIBLE' && ex.expectedStatus === 'ELIGIBLE') tp++;
    else if (predicted === 'ELIGIBLE' && ex.expectedStatus !== 'ELIGIBLE') fp++;
    else if (predicted !== 'ELIGIBLE' && ex.expectedStatus === 'ELIGIBLE') fn++;
    else tn++;
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  const accuracy = examples.length > 0 ? correct / examples.length : 0;

  return { f1, precision, recall, accuracy };
}

function calibrate(examples: CalibrationExample[]): void {
  console.log('\n═══════════════════════════════════════');
  console.log('  CALIBRATION DES SEUILS D\'ÉLIGIBILITÉ');
  console.log('═══════════════════════════════════════');
  console.log(`  Exemples : ${examples.length}`);
  console.log('───────────────────────────────────────\n');

  let bestEligible = 0.7;
  let bestPartial = 0.4;
  let bestF1 = -1;
  let bestStats = { f1: 0, precision: 0, recall: 0, accuracy: 0 };

  console.log('  Eligible | Partial | F1     | Prec   | Recall | Acc    ');
  console.log('  ─────────┼─────────┼────────┼────────┼────────┼────────');

  for (let e = 0.1; e <= 0.9; e += 0.05) {
    for (let p = 0.05; p < e; p += 0.05) {
      const stats = computeF1(examples, Math.round(e * 100) / 100, Math.round(p * 100) / 100);
      if (stats.f1 > bestF1) {
        bestF1 = stats.f1;
        bestEligible = Math.round(e * 100) / 100;
        bestPartial = Math.round(p * 100) / 100;
        bestStats = stats;
      }
    }
    if (Math.round(e * 100) % 10 === 0) {
      console.log(`  ${bestEligible.toFixed(2)}     | ${bestPartial.toFixed(2)}    | ${bestStats.f1.toFixed(4)} | ${bestStats.precision.toFixed(4)} | ${bestStats.recall.toFixed(4)} | ${bestStats.accuracy.toFixed(4)}`);
    }
  }

  console.log('\n  ─── Meilleurs seuils ───');
  console.log(`  ELIGIBLE_THRESHOLD = ${bestEligible}`);
  console.log(`  PARTIAL_THRESHOLD  = ${bestPartial}`);
  console.log(`  F1 = ${bestStats.f1.toFixed(4)}`);
  console.log(`  Precision = ${bestStats.precision.toFixed(4)}`);
  console.log(`  Recall = ${bestStats.recall.toFixed(4)}`);
  console.log(`  Accuracy = ${bestStats.accuracy.toFixed(4)}`);
  console.log('');
}

const dataFile = process.argv[2];
if (!dataFile) {
  console.error('Usage: npx ts-node src/eligibility/calibrate.ts <data-file.json>');
  process.exit(1);
}

const raw = readFileSync(dataFile, 'utf-8');
const examples: CalibrationExample[] = JSON.parse(raw);
calibrate(examples);
