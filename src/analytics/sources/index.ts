/**
 * Barrel file — exporte tout ce qui est nécessaire depuis le module sources.
 *
 * Usage dans le reste de l'app :
 * ```typescript
 * import { TransactionSourceRegistry, TransactionSourcesModule } from '../sources';
 * ```
 */

export type { TransactionSourceProvider } from './interfaces/transaction-source-provider.interface';
export { TRANSACTION_SOURCE_PROVIDER } from './interfaces/transaction-source-provider.interface';
export { TransactionSourceRegistry } from './registry/transaction-source-registry';
export { TransactionSourcesModule } from './sources.module';
export { DbSource } from './db-source/db-source.service';
export { DbSourceModule } from './db-source/db-source.module';
export { SmsSource } from './sms/sms-source.service';
export { SmsSourceModule } from './sms/sms-source.module';
