import { Controller, Get, Post } from '@nestjs/common';
import { PredictionLogger } from './prediction-logger.service';
import { DriftDetector } from './drift-detector.service';

@Controller('api/admin/monitoring')
export class MonitoringController {
  constructor(
    private readonly predictionLogger: PredictionLogger,
    private readonly driftDetector: DriftDetector,
  ) {}

  @Get('stats')
  async getStats() {
    return this.predictionLogger.getStats();
  }

  @Get('drift')
  async checkDrift() {
    return this.driftDetector.checkDrift();
  }

  @Post('baseline')
  async saveBaseline() {
    await this.driftDetector.saveBaseline();
    return { success: true, message: 'Baseline saved' };
  }
}
