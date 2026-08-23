import { Injectable, Logger } from '@nestjs/common';
import { PredictionLogger } from './prediction-logger.service';
import { RedisService } from '../redis/redis.service';
import e from 'express';

export type DriftReport = {
  hasDrift: boolean;
  alerts: string[];
  refusalRate: number;
  diversRate: number;
  scoreDistribution: Record<string, number>;
};

@Injectable()
export class DriftDetector {
  private readonly logger = new Logger(DriftDetector.name);
  private readonly BASELINE_KEY = 'monitoring:baseline';

  constructor(
    private readonly predictionLogger: PredictionLogger,
    private readonly redisService: RedisService,
  ) {}

  async checkDrift(): Promise<DriftReport> {
    const alerts: string[] = [];
    const stats = await this.predictionLogger.getStats();
    const baseline = await this.getBaseline();

    const refusalRate = stats.topPredictions['NOT_ELIGIBLE']
      ? stats.topPredictions['NOT_ELIGIBLE'] / stats.totalLogs
      : 0;
    if (refusalRate > 0.5 && (baseline.refusalRate ?? 0) > 0) {
      if (refusalRate > (baseline.refusalRate ?? 0) * 1.5) {
        alerts.push(
          `Refusal rate spike: ${(refusalRate * 100).toFixed(1)}% vs baseline ${((baseline.refusalRate ?? 0) * 100).toFixed(1)}%`,
        );
      }
    }

    const diversRate = stats.topPredictions['DIVERS']
      ? stats.topPredictions['DIVERS'] / stats.totalLogs
      : 0;
    if (diversRate > 0.4 && (baseline.diversRate ?? 0) > 0) {
      if (diversRate > (baseline.diversRate ?? 0) * 1.5) {
        alerts.push(
          `DIVERS classification spike: ${(diversRate * 100).toFixed(1)}% vs baseline ${((baseline.diversRate ?? 0) * 100).toFixed(1)}%`,
        );
      }
    }

    if (stats.avgConfidence < 0.3 && stats.totalLogs > 50) {
      alerts.push(
        `Average confidence low: ${(stats.avgConfidence * 100).toFixed(1)}%`,
      );
    }

    return {
      hasDrift: alerts.length > 0,
      alerts,
      refusalRate,
      diversRate,
      scoreDistribution: stats.topPredictions,
    };
  }

  async saveBaseline(): Promise<void> {
    const stats = await this.predictionLogger.getStats();
    const refusalRate = stats.topPredictions['NOT_ELIGIBLE']
      ? stats.topPredictions['NOT_ELIGIBLE'] / stats.totalLogs
      : 0;
    const diversRate = stats.topPredictions['DIVERS']
      ? stats.topPredictions['DIVERS'] / stats.totalLogs
      : 0;

    const baseline = {
      refusalRate,
      diversRate,
      savedAt: new Date().toISOString(),
    };
    await this.redisService.set(
      this.BASELINE_KEY,
      JSON.stringify(baseline),
      86_400 * 30,
    );
  }

  private async getBaseline(): Promise<{
    refusalRate: number;
    diversRate: number;
  }> {
    try {
      const raw = await this.redisService.get(this.BASELINE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { e }
      console.log(e)
    return { refusalRate: 0, diversRate: 0 };
  }
}
