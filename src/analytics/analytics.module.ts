import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { OverviewService } from './overview/overview.service';
import { TransactionSourcesModule } from './sources/sources.module';
import { BalanceReconstructor } from './shared/balance.reconstructor';
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
import { MatrixModule } from './matrix/matrix.module';
import { MatrixInterpreterEngine } from './matrix/matrix-interpreter.engine';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';

//pour revenir a l'ancien interpreter  supprimer MatrixInterpreterEngine et remmetre InterpreterEngine
@Module({
  imports: [
    TransactionSourcesModule,
    MatrixModule,
    EmbeddingsModule,
    RedisModule,
    AuthModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    BalanceReconstructor,
    OverviewService,
    Classifier,
    ExpenseEngine,
    RevenueEngine,
    BalanceEngine,
    DebtEngine,
    SavingsEngine,
    ScoreEngine,
    RecommendationEngine,
    AdviceEngine,
    MatrixInterpreterEngine,
    {
      provide: InterpreterEngine,
      useClass: MatrixInterpreterEngine,
    },
  ],
  exports: [OverviewService, Classifier],
})
export class AnalyticsModule {}
