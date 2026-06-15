import { Module } from '@nestjs/common';
import { TMoneySource } from './tmoney-source.service';

/**
 * Module de la source TMoney (Mobile Money).
 *
 * Fournit TMoneySource qui implémente TransactionSourceProvider.
 * TMoneySource est automatiquement collecté par TransactionSourcesModule
 * via le token TRANSACTION_SOURCE_PROVIDER.
 *
 * Si TMONEY_API_URL et TMONEY_API_KEY ne sont pas définis dans .env,
 * isAvailable() retournera false et la source sera ignorée.
 */
@Module({
  providers: [TMoneySource],
  exports: [TMoneySource],
})
export class TMoneySourceModule {}
