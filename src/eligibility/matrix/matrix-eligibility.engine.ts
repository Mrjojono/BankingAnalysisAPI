import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OverviewService } from '../../analytics/overview/overview.service';
import { EligibilityMatrixBuilder } from './eligibility-matrix.builder';
import {
  scoreProduct,
  normalizedScoreToStatus,
} from './eligibility-scoring.engine';
import type { EligibilityMetrics } from './types';
import type { EligibilityResult } from '../types';
import { buildInfoRules } from '../types';

@Injectable()
export class MatrixEligibilityEngine {
  private readonly logger = new Logger(MatrixEligibilityEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly overviewService: OverviewService,
    private readonly matrixBuilder: EligibilityMatrixBuilder,
  ) {}

  async evaluate(
    customerId: string,
    productCode: string,
    clientInputs: Record<string, number | boolean | string>,
  ): Promise<EligibilityResult> {
    const [product, analyticsMetrics] = await Promise.all([
      this.prisma.bankProduct.findUnique({
        where: { code: productCode },
        include: {
          rules: {
            where: { isActive: true },
            orderBy: [{ type: 'asc' }, { priority: 'desc' }],
          },
        },
      }),
      this.overviewService.gatherMetrics(customerId),
    ]);

    if (!product) {
      throw new Error(`Produit "${productCode}" introuvable`);
    }

    if (!product.isActive) {
      return {
        productCode: product.code,
        productName: product.name,
        productDescription: product.description ?? '',
        hasEligibilityRules: false,
        globalScore: 0,
        maxScore: 0,
        scorePercent: 0,
        status: 'NOT_ELIGIBLE',
        reason: 'Produit désactivé',
        ruleResults: [],
        infoRules: [],
        passedRules: [],
        failedRules: [],
        partialRules: [],
      };
    }

    const metrics: EligibilityMetrics = {
      ...analyticsMetrics,
      globalScore: computeGlobalScore(analyticsMetrics),
    };

    const eligibilityRules = product.rules.filter(
      (r) => r.type === 'ELIGIBILITY',
    );
    const infoRules = product.rules.filter((r) => r.type !== 'ELIGIBILITY');

    if (eligibilityRules.length === 0) {
      return this.defaultEligibleResult(product, infoRules);
    }

    const matrixProducts = await this.matrixBuilder.loadProducts();
    const matrixProduct = matrixProducts.find((p) => p.code === productCode);

    if (!matrixProduct) {
      return this.defaultEligibleResult(product, infoRules);
    }

    const scored = scoreProduct(matrixProduct, metrics, clientInputs);
    const status = normalizedScoreToStatus(scored.normalizedScore);
    const infoItems = buildInfoRules(infoRules);

    return {
      productCode: product.code,
      productName: product.name,
      productDescription: product.description ?? '',
      hasEligibilityRules: true,
      globalScore: Math.round(scored.earnedWeight),
      maxScore: scored.totalWeight,
      scorePercent: Math.round(scored.normalizedScore * 10000) / 100,
      status,
      ruleResults: scored.ruleResults,
      infoRules: infoItems,
      passedRules: scored.ruleResults.filter((r) => r.status === 'PASS'),
      failedRules: scored.ruleResults.filter((r) => r.status === 'FAIL'),
      partialRules: scored.ruleResults.filter((r) => r.status === 'PARTIAL'),
    };
  }

  private defaultEligibleResult(
    product: any,
    infoRules: any[],
  ): EligibilityResult {
    const infoItems = buildInfoRules(infoRules);
    return {
      productCode: product.code,
      productName: product.name,
      productDescription: product.description ?? '',
      hasEligibilityRules: false,
      globalScore: 0,
      maxScore: 0,
      scorePercent: 100,
      status: 'ELIGIBLE',
      ruleResults: [],
      infoRules: infoItems,
      passedRules: [],
      failedRules: [],
      partialRules: [],
    };
  }
}

function computeGlobalScore(metrics: Record<string, number>): number {
  const c1 =
    (metrics.expenseRatioScore ?? 50) * 0.5 +
    (metrics.paymentRegularityScore ?? 50) * 0.5;

  const c2 =
    (metrics.debtRatioScore ?? 50) * 0.4 +
    (metrics.repaymentRegularityScore ?? 50) * 0.35 +
    (metrics.creditUtilizationScore ?? 50) * 0.25;

  const c3 =
    (metrics.savingsRateScore ?? 50) * 0.5 +
    (metrics.emergencyFundScore ?? 50) * 0.3 +
    (metrics.savingsRegularityScore ?? 50) * 0.2;

  const c4 =
    (metrics.overdraftScore ?? 50) * 0.4 +
    (metrics.revenueVolatilityScore ?? 50) * 0.35 +
    (metrics.balanceVolatilityScore ?? 50) * 0.25;

  return Math.round(c1 * 0.25 + c2 * 0.25 + c3 * 0.25 + c4 * 0.25);
}
