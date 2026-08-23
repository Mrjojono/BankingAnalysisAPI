/**
 * Fait le lien entre le controller et le moteur d'éligibilité.
 * Utilise le moteur matriciel par défaut (MatrixEligibilityEngine).
 * Le moteur à base de règles (EligibilityEngine) reste accessible
 * avec mode='rules' pour comparaison.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OverviewService } from '../analytics/overview/overview.service';
import { EligibilityEngine } from './engines/eligibility.engine';
import { MatrixEligibilityEngine } from './matrix/matrix-eligibility.engine';
import { NotificationsService } from '../notifications/notifications.service';
import { EducationService } from '../education/education.service';
import { ANALYTICS_FIELD_MAP } from './types';
import type { EligibilityResult, ImprovementPlan, ImprovementPlanItem, SimulationResult, SimulationAdjustment, EligibilityDashboard, ProductScoreSummary, RuleResult } from './types';
import type { SimulateEligibilityDto } from './dto/eligibility.dto';

@Injectable()
export class EligibilityService {
  private readonly logger = new Logger(EligibilityService.name);

  constructor(
    private readonly ruleEngine: EligibilityEngine,
    private readonly matrixEngine: MatrixEligibilityEngine,
    private readonly prisma: PrismaService,
    private readonly overviewService: OverviewService,
    private readonly notificationsService: NotificationsService,
    private readonly educationService: EducationService,
  ) {}

  /**
   * Évalue l'éligibilité d'un client pour un produit.
   * Par défaut utilise le moteur matriciel (mode 'matrix').
   * Passer mode='rules' pour utiliser le moteur à base de règles.
   */
  async evaluateEligibility(
    customerId: string,
    productCode: string,
    inputs?: Record<string, number | boolean | string>,
    mode: 'matrix' | 'rules' = 'matrix',
  ): Promise<EligibilityResult> {
    const result =
      mode === 'rules'
        ? await this.ruleEngine.evaluate(customerId, productCode, inputs ?? {})
        : await this.matrixEngine.evaluate(customerId, productCode, inputs ?? {});

    try {
      if (
        result.hasEligibilityRules &&
        (result.status === 'ELIGIBLE' || result.status === 'PARTIAL')
      ) {
        const bankCustomer = await this.prisma.bankCustomer.findUnique({
          where: { id: customerId },
          include: { userConnection: true },
        });

        const userId = bankCustomer?.userConnection?.userId;
        if (userId) {
          const product = await this.prisma.bankProduct.findUnique({
            where: { code: productCode },
          });
          const productName = product?.name ?? productCode;

          await this.notificationsService.create(userId, {
            type: 'ELIGIBILITY',
            title: result.status === 'ELIGIBLE' ? 'Vous êtes éligible !' : 'Éligibilité partielle',
            body:
              result.status === 'ELIGIBLE'
                ? `Le produit "${productName}" vous est accessible (score ${result.scorePercent}%).`
                : `Votre profil atteint ${result.scorePercent}% des critères pour le produit "${productName}". Consultez le plan d'amélioration.`,
            severity: result.status === 'ELIGIBLE' ? 'INFO' : 'WARNING',
            data: {
              productCode,
              status: result.status,
              score: result.globalScore,
              scorePercent: result.scorePercent,
            },
            link: '/eligibility',
          });

          const lesson = await this.prisma.lesson.findFirst({
            where: { relatedProductId: product?.id, status: 'PUBLISHED' },
          });
          if (lesson) {
            await this.notificationsService.create(userId, {
              type: 'LESSON_RECOMMENDED',
              title: `Découvrez : ${lesson.title}`,
              body: `Une leçon pour mieux comprendre ce produit.`,
              severity: 'INFO',
              link: `/education/lessons/${lesson.id}`,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Erreur notification éligibilité pour ${customerId}:`,
        error,
      );
    }

    return result;
  }

  /**
   * Liste tous les produits bancaires actifs avec le nombre de règles
   * Utile pour afficher la liste dans l'UI et laisser l'utilisateur choisir
   */
  async listProducts() {
    return this.prisma.bankProduct.findMany({
      where: { isActive: true },
      select: {
        code: true, // ex: "COMPTES_PART"
        name: true, // ex: "Comptes — Particuliers"
        description: true, // Description du produit
        category: true, // ex: "ACCOUNT", "LOAN", "CARD"
        _count: { select: { rules: true } }, // Nombre de règles associées
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Récupère les règles d'un produit (tous types : ELIGIBILITY, FEE, INTEREST…)
   * Utile pour afficher les conditions générales dans l'UI
   */
  async getProductRules(productCode: string) {
    const product = await this.prisma.bankProduct.findUnique({
      where: { code: productCode },
      include: {
        rules: {
          where: { isActive: true },
          orderBy: [{ type: 'asc' }, { priority: 'desc' }],
          select: {
            code: true, // Code unique de la règle
            label: true, // Nom affichable
            description: true, // Description en français
            type: true, // ELIGIBILITY, FEE, LIMIT, INTEREST, VALUE_DATE
            field: true, // Champ associé (métier ou technique)
            operator: true, // Opérateur de comparaison
            value: true, // Valeur seuil principale
            valueMin: true, // Valeur min (pour BETWEEN)
            valueMax: true, // Valeur max (pour BETWEEN)
            percentage: true, // Pourcentage (pour taux)
            weight: true, // Poids dans le score
            priority: true, // Priorité d'affichage
          },
        },
      },
    });

    if (!product) throw new Error(`Produit "${productCode}" introuvable`);

    return product;
  }

  async simulate(dto: SimulateEligibilityDto): Promise<SimulationResult> {
    const mode = dto.mode ?? 'matrix';
    const evaluation = (inputs: Record<string, number | boolean | string>) =>
      mode === 'rules'
        ? this.ruleEngine.evaluate(dto.customerId, dto.productCode, inputs)
        : this.matrixEngine.evaluate(dto.customerId, dto.productCode, inputs);

    const currentMetrics = await this.overviewService.gatherMetrics(dto.customerId);
    const current = await evaluation({});

    const adjustments: SimulationAdjustment[] = [];
    const simulatedInputs: Record<string, number | boolean | string> = {};

    for (const [field, value] of Object.entries(dto.adjustments)) {
      const metricKey = ANALYTICS_FIELD_MAP[field] ?? field;
      const from = (currentMetrics as any)[metricKey] ?? 0;
      simulatedInputs[field] = value;
      adjustments.push({ field, from: Number(from), to: value, delta: value - Number(from) });
    }

    const simulated = await evaluation(simulatedInputs);

    return { current, simulated, adjustments };
  }

  async improvementPlan(customerId: string): Promise<ImprovementPlan> {
    const products = await this.prisma.bankProduct.findMany({
      where: { isActive: true },
    });

    let bestResult: EligibilityResult | null = null;
    const items: ImprovementPlanItem[] = [];

    for (const product of products) {
      const result = await this.matrixEngine.evaluate(customerId, product.code, {});
      if (!bestResult || result.scorePercent > bestResult.scorePercent) {
        bestResult = result;
      }

      for (const rule of result.ruleResults) {
        const maxRuleScore = result.maxScore > 0 ? rule.scoreMax : 0;
        const potentialIfPassed = maxRuleScore;
        const improvementGap = rule.status === 'FAIL' ? potentialIfPassed - rule.scoreEarned : 0;

        if (rule.status !== 'PASS') {
          items.push({
            ruleId: rule.ruleId,
            ruleCode: rule.ruleCode,
            label: rule.label,
            field: rule.field,
            status: rule.status,
            clientValue: rule.clientValue,
            threshold: rule.threshold,
            advice: rule.advice,
            potentialScore: potentialIfPassed,
            improvementGap,
          });
        }
      }
    }

    const currentGlobalScore = bestResult?.globalScore ?? 0;
    const maxScore = bestResult?.maxScore ?? 0;
    const potentialScore = Math.min(currentGlobalScore + items.reduce((s, i) => s + i.improvementGap, 0), maxScore);
    const improvementRate = maxScore > 0 ? potentialScore / maxScore : 0;

    return {
      customerId,
      currentGlobalScore,
      maxScore,
      potentialScore,
      improvementRate: Math.round(improvementRate * 10000) / 100,
      items,
    };
  }

  async dashboard(customerId: string): Promise<EligibilityDashboard> {
    const products = await this.prisma.bankProduct.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
    });

    const productScores: ProductScoreSummary[] = [];
    let bestScore: ProductScoreSummary | null = null;
    let worstScore: ProductScoreSummary | null = null;
    let scoreSum = 0;

    for (const product of products) {
      try {
        const result = await this.matrixEngine.evaluate(customerId, product.code, {});
        const summary: ProductScoreSummary = {
          productCode: product.code,
          productName: product.name,
          scorePercent: result.scorePercent,
          status: result.status,
        };
        productScores.push(summary);
        scoreSum += result.scorePercent;

        if (!bestScore || result.scorePercent > bestScore.scorePercent) bestScore = summary;
        if (!worstScore || result.scorePercent < worstScore.scorePercent) worstScore = summary;
      } catch (e) {
        this.logger.warn(`Dashboard: erreur produit ${product.code}: ${e}`);
      }
    }

    const totalProducts = productScores.length;
    const averageScore = totalProducts > 0 ? scoreSum / totalProducts : 0;

    const allRuleResults = productScores.length > 0
      ? (await this.matrixEngine.evaluate(customerId, products[0]?.code ?? '', {})).ruleResults
      : [];

    return {
      customerId,
      overview: {
        bestScore,
        worstScore,
        averageScore: Math.round(averageScore * 100) / 100,
        totalProducts,
      },
      productScores,
      criticalRules: allRuleResults.filter((r) => r.status !== 'PASS').slice(0, 5),
    };
  }
}
