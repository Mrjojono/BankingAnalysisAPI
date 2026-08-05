import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { PredictionLogger } from './prediction-logger.service';
import { DriftDetector } from './drift-detector.service';

@ApiTags('Admin - Monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('api/admin/monitoring')
export class MonitoringController {
  constructor(
    private readonly predictionLogger: PredictionLogger,
    private readonly driftDetector: DriftDetector,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get prediction stats' })
  async getStats() {
    return this.predictionLogger.getStats();
  }

  @Get('drift')
  @ApiOperation({ summary: 'Check for model drift' })
  async checkDrift() {
    return this.driftDetector.checkDrift();
  }

  @Post('baseline')
  @ApiOperation({ summary: 'Save current baseline' })
  async saveBaseline() {
    await this.driftDetector.saveBaseline();
    return { success: true, message: 'Baseline saved' };
  }
}
