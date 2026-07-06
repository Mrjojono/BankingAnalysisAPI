import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TrainingExample } from './types';

const DEFAULT_PATH = resolve(process.cwd(), 'training-data.json');

export function loadTrainingData(filePath?: string): TrainingExample[] {
  const path = filePath ?? DEFAULT_PATH;

  if (!existsSync(path)) {
    console.warn(`[DataLoader] Fichier non trouvé : ${path}`);
    console.warn(
      "[DataLoader] Création d'un fichier vide. Ajoute des exemples pour entraîner.",
    );
    writeFileSync(path, JSON.stringify([], null, 2));
    return [];
  }

  const raw = readFileSync(path, 'utf-8');
  const data = JSON.parse(raw) as TrainingExample[];
  console.log(`[DataLoader] ${data.length} exemples chargés depuis ${path}`);
  return data;
}

export function appendTrainingExample(
  example: TrainingExample,
  filePath?: string,
): void {
  const path = filePath ?? DEFAULT_PATH;
  const existing = loadTrainingData(path);
  existing.push(example);
  writeFileSync(path, JSON.stringify(existing, null, 2));
  console.log(
    `[DataLoader] Exemple ${example.id} ajouté. Total : ${existing.length}`,
  );
}

export function updateTrainingExample(
  id: string,
  updates: Partial<TrainingExample>,
  filePath?: string,
): TrainingExample | null {
  const path = filePath ?? DEFAULT_PATH;
  const existing = loadTrainingData(path);
  const idx = existing.findIndex((e) => e.id === id);
  if (idx === -1) {
    console.warn(`[DataLoader] Exemple ${id} introuvable.`);
    return null;
  }
  existing[idx] = { ...existing[idx], ...updates };
  writeFileSync(path, JSON.stringify(existing, null, 2));
  console.log(`[DataLoader] Exemple ${id} mis à jour.`);
  return existing[idx];
}

export function loadAndSplit(
  dataFile?: string,
  trainRatio: number = 0.7,
  valRatio: number = 0.15,
): { train: TrainingExample[]; val: TrainingExample[]; test: TrainingExample[] } {
  const all = loadTrainingData(dataFile);

  // Fisher-Yates shuffle
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const trainEnd = Math.floor(shuffled.length * trainRatio);
  const valEnd = trainEnd + Math.floor(shuffled.length * valRatio);

  const train = shuffled.slice(0, trainEnd);
  const val = shuffled.slice(trainEnd, valEnd);
  const test = shuffled.slice(valEnd);

  console.log(
    `[DataLoader] Split : ${train.length} train / ${val.length} val / ${test.length} test`,
  );

  return { train, val, test };
}

export function deleteTrainingExample(
  id: string,
  filePath?: string,
): boolean {
  const path = filePath ?? DEFAULT_PATH;
  const existing = loadTrainingData(path);
  const filtered = existing.filter((e) => e.id !== id);
  if (filtered.length === existing.length) {
    console.warn(`[DataLoader] Exemple ${id} introuvable.`);
    return false;
  }
  writeFileSync(path, JSON.stringify(filtered, null, 2));
  console.log(`[DataLoader] Exemple ${id} supprimé.`);
  return true;
}
