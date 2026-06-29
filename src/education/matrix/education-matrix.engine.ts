import { Injectable, Logger } from '@nestjs/common';
import { OverviewService } from '../../analytics/overview/overview.service';
import { PrismaService } from '../../prisma/prisma.service';
import { buildEducationVector } from './education-context.builder';
import {
  buildEducationWeightMatrix,
  SCORE_THRESHOLD,
} from './education-intent-matrix';
import {
  computeScores,
  selectActiveAdviceTypes,
} from './education-scoring.engine';
import type { FinancialMetrics } from './types';

@Injectable()
export class EducationMatrixEngine {
  private readonly logger = new Logger(EducationMatrixEngine.name);

  constructor(
    private readonly overviewService: OverviewService,
    private readonly prisma: PrismaService,
  ) {}

  async getRecommendedAdviceTypes(customerId: string): Promise<string[]> {
    try {
      const metrics = await this.loadMetrics(customerId);
      const vector = buildEducationVector(metrics);
      const matrix = buildEducationWeightMatrix();
      const scores = computeScores(vector, matrix);
      const active = selectActiveAdviceTypes(scores, SCORE_THRESHOLD);
      return active.map((s) => s.kind);
    } catch (error) {
      this.logger.warn(`Erreur matrice éducative: ${(error as Error).message}`);
      return [];
    }
  }

  private async loadMetrics(customerId: string): Promise<FinancialMetrics> {
    const overview = await this.overviewService.gatherMetrics(customerId);

    const progress = await this.prisma.userLessonProgress.findMany({
      where: {
        user: {
          bankConnections: { some: { bankCustomerId: customerId } },
        },
      },
    });

    const completed = progress.filter((p) => p.completed).length;

    const quizAttempts = await this.prisma.quizAttempt.findMany({
      where: {
        userId: progress[0]?.userId ?? '',
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    let quizCompletionRate = 0;
    if (quizAttempts.length > 0) {
      const totalScore = quizAttempts.reduce((s, a) => s + a.score, 0);
      const totalMax = quizAttempts.reduce((s, a) => s + a.total, 0);
      quizCompletionRate = totalMax > 0 ? totalScore / totalMax : 0;
    }

    return {
      expenseRatio: overview.expenseRatio ?? 0,
      savingsRate: overview.savingsRate ?? 0,
      debtRatio: overview.debtRatio ?? 0,
      overdraftDays: overview.overdraftDays ?? 0,
      revenueVolatilityScore: overview.revenueVolatilityScore ?? 50,
      globalScore: overview.globalScore ?? 50,
      expenseRatioScore: overview.expenseRatioScore ?? 50,
      savingsRateScore: overview.savingsRateScore ?? 50,
      debtRatioScore: overview.debtRatioScore ?? 50,
      balanceVolatilityScore: overview.balanceVolatilityScore ?? 50,
      quizCompletionRate,
      lessonsCompleted: completed,
    };
  }
}
