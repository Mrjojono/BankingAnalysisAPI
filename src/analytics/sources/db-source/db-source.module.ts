import { Module } from '@nestjs/common';
import { DbSource } from './db-source.service';
import { PrismaService } from '../../../prisma/prisma.service';

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
  providers: [DbSource, PrismaService],
  exports: [DbSource],
})
export class DbSourceModule {}
