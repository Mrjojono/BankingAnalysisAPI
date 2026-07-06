import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export type PredictionLog = {
  timestamp: string;
  userId?: string;
  modelVersion: string;
  input: string;
  prediction: string;
  confidence: number;
  latencyMs: number;
};

@Injectable()
export class PredictionLogger {
  private readonly logger = new Logger(PredictionLogger.name);
  private readonly LIST_KEY = 'monitoring:prediction_logs';
  private readonly MAX_LOGS = 10000;

  constructor(private readonly redisService: RedisService) {}

  async log(entry: Omit<PredictionLog, 'timestamp'>): Promise<void> {
    const log: PredictionLog = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    await this.redisService.lpush(this.LIST_KEY, JSON.stringify(log));
    await this.redisService.ltrim(this.LIST_KEY, 0, this.MAX_LOGS - 1);
  }

  async getRecent(count: number = 100): Promise<PredictionLog[]> {
    const items = await this.redisService.lrange(this.LIST_KEY, 0, count - 1);
    return items.map((item) => JSON.parse(item));
  }

  async getStats(): Promise<{
    totalLogs: number;
    topPredictions: Record<string, number>;
    avgConfidence: number;
    avgLatency: number;
  }> {
    const items = await this.redisService.lrange(this.LIST_KEY, 0, 999);
    const logs = items.map((item) => JSON.parse(item));

    if (logs.length === 0) {
      return { totalLogs: 0, topPredictions: {}, avgConfidence: 0, avgLatency: 0 };
    }

    const predictions: Record<string, number> = {};
    let totalConfidence = 0;
    let totalLatency = 0;

    for (const log of logs) {
      predictions[log.prediction] = (predictions[log.prediction] ?? 0) + 1;
      totalConfidence += log.confidence ?? 0;
      totalLatency += log.latencyMs ?? 0;
    }

    return {
      totalLogs: logs.length,
      topPredictions: predictions,
      avgConfidence: totalConfidence / logs.length,
      avgLatency: totalLatency / logs.length,
    };
  }
}
