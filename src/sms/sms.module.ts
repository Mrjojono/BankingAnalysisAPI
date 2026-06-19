/**
 * sms.module.ts — Module de synchronisation SMS (Mobile Money).
 *
 * Endpoint :
 *   POST /sms/sync
 *     Body : { customerId: string, messages: RawSms[] }
 *     → Parse, déduplique et insère les transactions SMS en base
 *
 * Dépendances :
 *   - PrismaModule → accès base de données
 *   - AuthModule   → protection JWT
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';

@Module({
  imports: [PrismaModule, AuthModule, AnalyticsModule],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
