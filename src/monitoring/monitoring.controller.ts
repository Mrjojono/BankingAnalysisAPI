import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
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
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Santé système : DB, Redis, mémoire, uptime' })
  async health() {
    const startedAt = Date.now() - process.uptime() * 1000;

    let db: { status: 'UP' | 'DOWN'; latencyMs?: number; error?: string } = { status: 'DOWN' };
    try {
      const t0 = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      db = { status: 'UP', latencyMs: Date.now() - t0 };
    } catch (e: any) {
      db = { status: 'DOWN', error: e?.message };
    }

    let redis: { status: 'UP' | 'DOWN'; latencyMs?: number; error?: string } = { status: 'DOWN' };
    try {
      const t0 = Date.now();
      const pong = await this.redis.ping();
      redis = { status: pong === 'PONG' ? 'UP' : 'DOWN', latencyMs: Date.now() - t0 };
    } catch (e: any) {
      redis = { status: 'DOWN', error: e?.message };
    }

    const mem = process.memoryUsage();
    return {
      status: db.status === 'UP' && redis.status === 'UP' ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      startedAt: new Date(startedAt).toISOString(),
      uptimeSec: Math.round(process.uptime()),
      node: process.version,
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      },
      database: db,
      redis,
    };
  }

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
