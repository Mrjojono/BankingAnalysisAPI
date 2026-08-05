import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../../analytics/analytics.module';
import { EligibilityMatrixBuilder } from './eligibility-matrix.builder';
import { MatrixEligibilityEngine } from './matrix-eligibility.engine';

@Module({
  imports: [AnalyticsModule],
  providers: [
    EligibilityMatrixBuilder,
    MatrixEligibilityEngine,
  ],
  exports: [EligibilityMatrixBuilder, MatrixEligibilityEngine],
})
export class EligibilityMatrixModule {}
