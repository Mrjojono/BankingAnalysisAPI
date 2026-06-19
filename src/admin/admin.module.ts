import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { TrainingModule } from '../analytics/training/training.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [PrismaModule, AuthModule, AnalyticsModule, TrainingModule, SmsModule],
  controllers: [AdminController],
})
export class AdminModule {}
