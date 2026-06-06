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
import { ScoreEngine } from './engines/score.engine';
import { RecommendationEngine } from './engines/recommendation.engine';
import { AdviceEngine } from './engines/advice.engine';
import { InterpreterEngine } from './engines/interpreter.engine';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RedisModule, AuthModule],
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
    ScoreEngine,
    RecommendationEngine,
    AdviceEngine,
    InterpreterEngine,
  ],
  exports: [OverviewService],
})
export class AnalyticsModule {}
