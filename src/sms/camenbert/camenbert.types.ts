export interface CamenBertResult {
  category: string;
  direction: 'DEBIT' | 'CREDIT' | null;
  confidence: number;
  rawScores: Record<string, number>;
}

export interface CamenBertConfig {
  modelPath: string;
  vocabPath: string;
  maxLength: number;
  categories: string[];
}
