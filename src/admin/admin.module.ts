import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { TrainingModule } from '../analytics/training/training.module';

@Module({
  imports: [PrismaModule, AuthModule, AnalyticsModule, TrainingModule],
  controllers: [AdminController],
})
export class AdminModule {}
