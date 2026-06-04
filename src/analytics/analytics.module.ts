import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { OverviewService } from './overview/overview.service';
import { TransactionFetcher } from './shared/transaction.fetcher';
import { BalanceReconstructor } from './shared/balance.reconstructor';
import { PrismaService } from '../prisma/prisma.service';
import { Classifier } from './shared/classifier';
import { ExpenseEngine } from './engines/expense.engine';
import { RevenueEngine } from './engines/revenue.engine';
import { BalanceEngine } from './engines/balance.engine';
import { DebtEngine } from './engines/debt.engine';
import { SavingsEngine } from './engines/savings.engine';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [AnalyticsController],
  providers: [
    TransactionFetcher,
    BalanceReconstructor,
    OverviewService,
    PrismaService,
    Classifier,
    ExpenseEngine,
    RevenueEngine,
    BalanceEngine,
    DebtEngine,
    SavingsEngine,
  ],
})
export class AnalyticsModule {}
