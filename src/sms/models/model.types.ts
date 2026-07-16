export interface ModelConfig {
  name: string;
  path: string;
  tokenizerPath?: string;
}

export interface ModelInferenceResult {
  label: string;
  confidence: number;
  rawOutput: number[];
}

export type ModelStatus = 'unloaded' | 'loading' | 'loaded' | 'error';
