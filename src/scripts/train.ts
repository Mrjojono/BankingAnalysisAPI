/**
 * Script CLI d'entraînement de la matrice des poids.
 *
 * Usage :
 *   npx ts-node src/scripts/train.ts
 *   npx ts-node src/scripts/train.ts --epochs 200 --lr 0.01
 *   npx ts-node src/scripts/train.ts --layers 2
 */

import { NestFactory } from '@nestjs/core';
import { TrainingModule } from '../analytics/training/training.module';
import { TrainCommand } from '../analytics/training/train-command';

async function bootstrap() {
  const args = parseArgs();

  const app = await NestFactory.createApplicationContext(TrainingModule);
  const trainer = app.get(TrainCommand);

  try {
    await trainer.run({
      epochs: typeof args.epochs === 'number' ? args.epochs : 100,
      learningRate: typeof args.lr === 'number' ? args.lr : 0.01,
      margin: typeof args.margin === 'number' ? args.margin : 0.5,
      dataFile:
        typeof args.data === 'string' ? args.data : 'training-data.json',
      layers: args.layers === 2 ? 2 : 1,
    });
  } finally {
    await app.close();
  }
}

function parseArgs(): Record<string, unknown> {
  const argv = process.argv.slice(2);
  const result: Record<string, unknown> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1];
      if (val !== undefined && !val.startsWith('--')) {
        const num = Number(val);
        result[key] = isNaN(num) ? val : num;
        i++;
      } else {
        result[key] = true;
      }
    }
  }

  return result;
}

bootstrap().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
