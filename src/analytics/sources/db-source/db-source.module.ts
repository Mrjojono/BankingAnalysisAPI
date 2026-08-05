import { Module } from '@nestjs/common';
import { DbSource } from './db-source.service';

/**
 * Module de la source de base de données.
 *
 * Fournit DbSource qui implémente TransactionSourceProvider
 * en lisant les transactions depuis PostgreSQL via Prisma.
 *
 * DbSource est automatiquement collecté par TransactionSourcesModule
 * via le token TRANSACTION_SOURCE_PROVIDER.
 */
@Module({
  providers: [DbSource],
  exports: [DbSource],
})
export class DbSourceModule {}
