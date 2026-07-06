import type { WeightMatrix, ScoredIntent } from '../matrix/types';
import { INTENT_INDEX } from '../matrix/intent-matrix';
import { buildFeatureVector } from '../matrix/context-vector.builder';
import { computeScores } from '../matrix/scoring-engine';
import type { TrainingExample, TrainingMetrics } from './types';

const relu = (x: number) => Math.max(0, x);
const reluDeriv = (x: number) => (x > 0 ? 1 : 0);

function findWrongIndex(scores: ScoredIntent[], correctIndex: number): number {
  let bestWrong = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < scores.length; i++) {
    if (i === correctIndex) continue;
    if (scores[i].score > bestScore) {
      bestScore = scores[i].score;
      bestWrong = i;
    }
  }
  return bestWrong;
}

function marginLoss(
  correctScore: number,
  wrongScore: number,
  margin: number,
): number {
  return Math.max(0, wrongScore - correctScore + margin);
}

function computeValLossSingle(
  examples: TrainingExample[],
  W: WeightMatrix,
  margin: number,
): number {
  let totalLoss = 0;
  for (const ex of examples) {
    const vector = buildFeatureVector(ex.context);
    const scores = computeScores(vector, W);
    const correctIdx = INTENT_INDEX[ex.expected] as number | undefined;
    if (correctIdx === undefined) continue;

    const wrongIdx = findWrongIndex(scores, correctIdx);
    if (wrongIdx === -1) continue;

    const correctScore = scores[correctIdx].score;
    const wrongScore = scores[wrongIdx].score;
    totalLoss += marginLoss(correctScore, wrongScore, margin);
  }
  return examples.length > 0 ? totalLoss / examples.length : 0;
}

function computeValLossTwo(
  examples: TrainingExample[],
  W1: WeightMatrix,
  W2: WeightMatrix,
  margin: number,
): number {
  const hiddenSize = W2.length;
  let totalLoss = 0;
  for (const ex of examples) {
    const vector = buildFeatureVector(ex.context);
    const correctIdx = INTENT_INDEX[ex.expected] as number | undefined;
    if (correctIdx === undefined) continue;

    const hidden: number[] = [];
    for (let j = 0; j < hiddenSize; j++) {
      let sum = 0;
      for (let i = 0; i < vector.length; i++) {
        sum += vector[i] * (W1[i]?.[j] ?? 0);
      }
      hidden.push(relu(sum));
    }

    const scores: number[] = [];
    for (let j = 0; j < W2[0].length; j++) {
      let sum = 0;
      for (let i = 0; i < hidden.length; i++) {
        sum += hidden[i] * (W2[i]?.[j] ?? 0);
      }
      scores.push(sum);
    }

    let wrongIdx = -1;
    let wrongScore = -Infinity;
    for (let i = 0; i < scores.length; i++) {
      if (i !== correctIdx && scores[i] > wrongScore) {
        wrongScore = scores[i];
        wrongIdx = i;
      }
    }
    if (wrongIdx === -1) continue;

    totalLoss += marginLoss(scores[correctIdx], wrongScore, margin);
  }
  return examples.length > 0 ? totalLoss / examples.length : 0;
}

export function trainSingleLayer(
  examples: TrainingExample[],
  initialMatrix: WeightMatrix,
  epochs: number,
  learningRate: number,
  margin: number,
  valExamples?: TrainingExample[],
  patience?: number,
): { W: WeightMatrix; metrics: TrainingMetrics[] } {
  const W: WeightMatrix = initialMatrix.map((row) => [...row]);
  let bestW: WeightMatrix = W.map((row) => [...row]);
  const metrics: TrainingMetrics[] = [];

  let bestValLoss = Infinity;
  let patienceCounter = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    let totalLoss = 0;
    let correct = 0;

    for (const ex of examples) {
      const vector = buildFeatureVector(ex.context);
      const scores = computeScores(vector, W);
      const correctIdx = INTENT_INDEX[ex.expected] as number | undefined;

      if (correctIdx === undefined) {
        console.warn(`[Trainer] Intention inconnue : ${ex.expected}, ignoré`);
        continue;
      }

      const wrongIdx = findWrongIndex(scores, correctIdx);
      if (wrongIdx === -1) continue;

      const correctScore = scores[correctIdx].score;
      const wrongScore = scores[wrongIdx].score;
      const loss = marginLoss(correctScore, wrongScore, margin);
      totalLoss += loss;

      if (correctScore > wrongScore) correct++;

      if (loss > 0) {
        for (let i = 0; i < vector.length; i++) {
          W[i][correctIdx] = (W[i][correctIdx] ?? 0) + learningRate * vector[i];
          W[i][wrongIdx] = (W[i][wrongIdx] ?? 0) - learningRate * vector[i];
        }
      }
    }

    const accuracy =
      examples.length > 0 ? (correct / examples.length) * 100 : 0;
    const avgLoss = examples.length > 0 ? totalLoss / examples.length : 0;

    if (epoch % 10 === 0 || epoch === epochs - 1) {
      console.log(
        `[Trainer] Étape ${String(epoch).padStart(4, ' ')} | Loss: ${avgLoss.toFixed(4)} | Accuracy: ${accuracy.toFixed(1)}%`,
      );
    }

    metrics.push({ epoch, loss: avgLoss, accuracy, top3Accuracy: accuracy });

    if (valExamples && valExamples.length > 0 && patience) {
      const valLoss = computeValLossSingle(valExamples, W, margin);
      if (epoch % 10 === 0 || epoch === epochs - 1) {
        console.log(
          `          Val Loss: ${valLoss.toFixed(4)}`,
        );
      }

      if (valLoss < bestValLoss) {
        bestValLoss = valLoss;
        patienceCounter = 0;
        bestW = W.map((row) => [...row]);
      } else {
        patienceCounter++;
        if (patienceCounter >= patience) {
          console.log(
            `[Trainer] Early stopping à l'étape ${epoch} (val loss n'a pas amélioré depuis ${patience} étapes)`,
          );
          break;
        }
      }
    }
  }

  if (valExamples && patience) {
    return { W: bestW, metrics };
  }
  return { W, metrics };
}

export function trainTwoLayer(
  examples: TrainingExample[],
  initialW1: WeightMatrix,
  initialW2: WeightMatrix,
  epochs: number,
  learningRate: number,
  margin: number,
  valExamples?: TrainingExample[],
  patience?: number,
): { W1: WeightMatrix; W2: WeightMatrix; metrics: TrainingMetrics[] } {
  const W1: WeightMatrix = initialW1.map((r) => [...r]);
  const W2: WeightMatrix = initialW2.map((r) => [...r]);
  let bestW1: WeightMatrix = W1.map((r) => [...r]);
  let bestW2: WeightMatrix = W2.map((r) => [...r]);
  const hiddenSize = W2.length;
  const metrics: TrainingMetrics[] = [];

  let bestValLoss = Infinity;
  let patienceCounter = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    let totalLoss = 0;
    let correct = 0;

    for (const ex of examples) {
      const vector = buildFeatureVector(ex.context);
      const correctIdx = INTENT_INDEX[ex.expected] as number | undefined;
      if (correctIdx === undefined) continue;

      // Forward
      const hidden: number[] = [];
      for (let j = 0; j < hiddenSize; j++) {
        let sum = 0;
        for (let i = 0; i < vector.length; i++) {
          sum += vector[i] * (W1[i]?.[j] ?? 0);
        }
        hidden.push(relu(sum));
      }

      const scores: number[] = [];
      for (let j = 0; j < W2[0].length; j++) {
        let sum = 0;
        for (let i = 0; i < hidden.length; i++) {
          sum += hidden[i] * (W2[i]?.[j] ?? 0);
        }
        scores.push(sum);
      }

      const correctScore = scores[correctIdx];
      let wrongIdx = -1;
      let wrongScore = -Infinity;
      for (let i = 0; i < scores.length; i++) {
        if (i !== correctIdx && scores[i] > wrongScore) {
          wrongScore = scores[i];
          wrongIdx = i;
        }
      }

      if (wrongIdx === -1) continue;

      const loss = marginLoss(correctScore, wrongScore, margin);
      totalLoss += loss;
      if (correctScore > wrongScore) correct++;

      if (loss > 0) {
        // Gradients sur W2
        //dL/dW2[i][j] = hidden[i] * (j === correctIdx ? -1 : j === wrongIdx ? +1 : 0)
        const dLdscores: number[] = new Array(W2[0].length).fill(0);
        dLdscores[correctIdx] = -1;
        dLdscores[wrongIdx] = +1;

        for (let i = 0; i < hiddenSize; i++) {
          W2[i][correctIdx] =
            (W2[i][correctIdx] ?? 0) -
            learningRate * hidden[i] * dLdscores[correctIdx];
          W2[i][wrongIdx] =
            (W2[i][wrongIdx] ?? 0) -
            learningRate * hidden[i] * dLdscores[wrongIdx];
        }

        // Gradient sur la couche cachée : dL/dhidden = dL/dscores × W2^T
        const dLdhidden: number[] = new Array(hiddenSize).fill(0);
        for (let i = 0; i < hiddenSize; i++) {
          for (let j = 0; j < scores.length; j++) {
            dLdhidden[i] += dLdscores[j] * (W2[i]?.[j] ?? 0);
          }
        }

        // Gradient sur W1
        for (let i = 0; i < vector.length; i++) {
          for (let j = 0; j < hiddenSize; j++) {
            const grad = dLdhidden[j] * reluDeriv(hidden[j]) * vector[i];
            W1[i][j] = (W1[i][j] ?? 0) - learningRate * grad;
          }
        }
      }
    }

    const accuracy =
      examples.length > 0 ? (correct / examples.length) * 100 : 0;
    const avgLoss = examples.length > 0 ? totalLoss / examples.length : 0;

    if (epoch % 10 === 0 || epoch === epochs - 1) {
      console.log(
        `[Trainer] Étape ${String(epoch).padStart(4, ' ')} | Loss: ${avgLoss.toFixed(4)} | Accuracy: ${accuracy.toFixed(1)}%`,
      );
    }

    metrics.push({ epoch, loss: avgLoss, accuracy, top3Accuracy: accuracy });

    if (valExamples && valExamples.length > 0 && patience) {
      const valLoss = computeValLossTwo(valExamples, W1, W2, margin);
      if (epoch % 10 === 0 || epoch === epochs - 1) {
        console.log(
          `          Val Loss: ${valLoss.toFixed(4)}`,
        );
      }

      if (valLoss < bestValLoss) {
        bestValLoss = valLoss;
        patienceCounter = 0;
        bestW1 = W1.map((r) => [...r]);
        bestW2 = W2.map((r) => [...r]);
      } else {
        patienceCounter++;
        if (patienceCounter >= patience) {
          console.log(
            `[Trainer] Early stopping à l'étape ${epoch} (val loss n'a pas amélioré depuis ${patience} étapes)`,
          );
          break;
        }
      }
    }
  }

  if (valExamples && patience) {
    return { W1: bestW1, W2: bestW2, metrics };
  }
  return { W1, W2, metrics };
}

export function forwardTwoLayer(
  vector: number[],
  W1: number[][],
  W2: number[][],
): number[] {
  const hiddenSize = W2.length;
  const hidden: number[] = [];
  for (let j = 0; j < hiddenSize; j++) {
    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
      sum += vector[i] * (W1[i]?.[j] ?? 0);
    }
    hidden.push(Math.max(0, sum)); // ReLU
  }

  const scores: number[] = [];
  for (let j = 0; j < W2[0].length; j++) {
    let sum = 0;
    for (let i = 0; i < hidden.length; i++) {
      sum += hidden[i] * (W2[i]?.[j] ?? 0);
    }
    scores.push(sum);
  }

  // Softmax
  const max = Math.max(...scores);
  const exps = scores.map(s => Math.exp(s - max));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  return exps.map(s => (sumExp > 0 ? s / sumExp : 0));
}
