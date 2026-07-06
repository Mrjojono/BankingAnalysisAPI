import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { PredictionLogger } from './prediction-logger.service';
import { DriftDetector } from './drift-detector.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [MonitoringController],
  providers: [PredictionLogger, DriftDetector],
  exports: [PredictionLogger, DriftDetector],
})
export class MonitoringModule {}
