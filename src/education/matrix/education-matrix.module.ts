import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../../analytics/analytics.module';
import { EducationMatrixEngine } from './education-matrix.engine';

@Module({
  imports: [AnalyticsModule],
  providers: [EducationMatrixEngine],
  exports: [EducationMatrixEngine],
})
export class EducationMatrixModule {}
