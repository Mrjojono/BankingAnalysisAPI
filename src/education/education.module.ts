import { Module } from '@nestjs/common';
import { EducationController } from './education.controller';
import { EducationAdminController } from './education-admin.controller';
import { EducationService } from './education.service';
import { EducationMatrixModule } from './matrix/education-matrix.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [EducationMatrixModule, AnalyticsModule],
  controllers: [EducationController, EducationAdminController],
  providers: [EducationService, PrismaService],
  exports: [EducationService],
})
export class EducationModule {}
