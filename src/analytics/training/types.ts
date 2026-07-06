import type { RuleContext } from '../engines/interpreter.engine';
import type { WeightMatrix } from '../matrix/types';

export type TrainingExample = {
  id: string;
  context: RuleContext;
  expected: string;
  notes?: string;
};

export type TrainingConfig = {
  epochs: number;
  learningRate: number;
  margin: number;
  dataFile: string;
  layers: 1 | 2;
  patience: number;
};

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  epochs: 100,
  learningRate: 0.01,
  margin: 0.5,
  dataFile: 'training-data.json',
  layers: 1,
  patience: 10,
};

export type TrainingMetrics = {
  epoch: number;
  loss: number;
  accuracy: number;
  top3Accuracy: number;
};

export type TrainingResult = {
  config: TrainingConfig;
  metrics: TrainingMetrics[];
  finalAccuracy: number;
  W1: WeightMatrix;
  W2: WeightMatrix | null;
};
