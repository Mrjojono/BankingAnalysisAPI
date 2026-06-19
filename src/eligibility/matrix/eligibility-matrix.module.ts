import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AnalyticsModule } from '../../analytics/analytics.module';
import { EligibilityMatrixBuilder } from './eligibility-matrix.builder';
import { MatrixEligibilityEngine } from './matrix-eligibility.engine';

@Module({
  imports: [AnalyticsModule],
  providers: [
    EligibilityMatrixBuilder,
    MatrixEligibilityEngine,
    PrismaService,
    RedisService,
  ],
  exports: [EligibilityMatrixBuilder, MatrixEligibilityEngine],
})
export class EligibilityMatrixModule {}
