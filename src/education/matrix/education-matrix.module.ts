import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsModule } from '../../analytics/analytics.module';
import { EducationMatrixEngine } from './education-matrix.engine';

@Module({
  imports: [AnalyticsModule],
  providers: [EducationMatrixEngine, PrismaService],
  exports: [EducationMatrixEngine],
})
export class EducationMatrixModule {}
