import { Injectable, Logger, Optional } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ELIGIBLE_THRESHOLD, PARTIAL_THRESHOLD } from './types';

export type CalibratedThresholds = {
  eligible: number;
  partial: number;
};

@Injectable()
export class EligibilityCalibrator {
  private readonly logger = new Logger(EligibilityCalibrator.name);
  private readonly CACHE_KEY = 'eligibility:thresholds';

  constructor(@Optional() private readonly redisService?: RedisService) {}

  async getThresholds(): Promise<CalibratedThresholds> {
    if (this.redisService) {
      try {
        const cached = await this.redisService.get(this.CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as CalibratedThresholds;
          return parsed;
        }
      } catch (e) {
        this.logger.warn('Failed to read thresholds from Redis', e);
      }
    }
    return { eligible: ELIGIBLE_THRESHOLD, partial: PARTIAL_THRESHOLD };
  }

  async setThresholds(thresholds: CalibratedThresholds): Promise<void> {
    if (this.redisService) {
      await this.redisService.set(
        this.CACHE_KEY,
        JSON.stringify(thresholds),
        86_400 * 365, // 1 year (effectively permanent)
      );
      this.logger.log(`Thresholds updated: eligible=${thresholds.eligible}, partial=${thresholds.partial}`);
    }
  }
}
