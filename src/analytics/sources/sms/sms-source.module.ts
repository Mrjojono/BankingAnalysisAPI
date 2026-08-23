import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SmsSource } from './sms-source.service';

/**
 * Module de la source SMS (Mobile Money).
 *
 * Fournit SmsSource qui implémente TransactionSourceProvider.
 * SmsSource est automatiquement collecté par TransactionSourcesModule
 * via le token TRANSACTION_SOURCE_PROVIDER.
 */
@Module({
  imports: [PrismaModule],
  providers: [SmsSource],
  exports: [SmsSource],
})
export class SmsSourceModule {}
