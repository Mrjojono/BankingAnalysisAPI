import { Module } from '@nestjs/common';
import { DbSourceModule } from './db-source/db-source.module';
import { SmsSourceModule } from './sms/sms-source.module';
import { TransactionSourceRegistry } from './registry/transaction-source-registry';
import { DbSource } from './db-source/db-source.service';
import { SmsSource } from './sms/sms-source.service';
import { TRANSACTION_SOURCE_PROVIDER } from './interfaces/transaction-source-provider.interface';

/**
 * Module racine des sources de transactions.
 *
 * Rôle :
 * 1. Importer tous les modules de sources (DbSourceModule, SmsSourceModule, etc.)
 * 2. Collecter toutes les sources dans un tableau via le token TRANSACTION_SOURCE_PROVIDER
 * 3. Fournir TransactionSourceRegistry qui orchestre l'agrégation
 *
 * Pour AJOUTER une nouvelle source :
 * 1. Créer un dossier `ma-source/` avec son module et son service
 * 2. Implémenter TransactionSourceProvider
 * 3. Importer le module ici et l'ajouter dans useFactory
 *
 * @example
 * ```typescript
 * // Ajouter une source Moov Money :
 * imports: [..., MoovSourceModule],
 * providers: [
 *   {
 *     provide: TRANSACTION_SOURCE_PROVIDER,
 *     useFactory: (db, sms, moov) => [db, sms, moov],
 *     inject: [DbSource, SmsSource, MoovSource],
 *   },
 * ]
 * ```
 */
@Module({
  imports: [DbSourceModule, SmsSourceModule],
  providers: [
    {
      provide: TRANSACTION_SOURCE_PROVIDER,
      useFactory: (dbSource: DbSource, smsSource: SmsSource) => {
        return [dbSource, smsSource];
      },
      inject: [DbSource, SmsSource],
    },
    TransactionSourceRegistry,
  ],
  exports: [TransactionSourceRegistry],
})
export class TransactionSourcesModule {}
