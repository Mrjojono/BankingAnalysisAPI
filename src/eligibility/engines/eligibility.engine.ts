/**
 * eligibility.engine.ts — Moteur principal d'éligibilité
 *
 * Rôle :
 *   1. Charge un produit bancaire et toutes ses règles depuis la base
 *   2. Récupère les métriques analytics du client (via OverviewService)
 *   3. Évalue les règles ELIGIBILITY → score + statut
 *   4. Ajoute les autres règles (FEE, LIMIT, INTEREST) en info
 *   5. Si aucune règle ELIGIBILITY → éligible par défaut avec affichage des frais
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OverviewService } from '../../analytics/overview/overview.service';
import { RuleEvaluator } from './rule-evaluator';
import type { EligibilityResult, RuleResult } from '../types';
import { ANALYTICS_FIELD_MAP, ELIGIBLE_THRESHOLD, PARTIAL_THRESHOLD } from '../types';

@Injectable()
export class EligibilityEngine {
  private readonly logger = new Logger(EligibilityEngine.name);

  constructor(
    private prisma: PrismaService,
    private ruleEvaluator: RuleEvaluator,
    private overviewService: OverviewService,
  ) {}

  /**
   * Évalue l'éligibilité d'un client pour un produit
   */
  async evaluate(
    customerId: string,
    productCode: string,
    clientInputs: Record<string, number | boolean | string> = {},
  ): Promise<EligibilityResult> {
    // ─── Étape 1 : Charger le produit + TOUTES ses règles actives ───
    const product = await this.prisma.bankProduct.findUnique({
      where: { code: productCode },
      include: {
        rules: {
          where: { isActive: true },
          orderBy: [{ type: 'asc' }, { priority: 'desc' }],
        },
      },
    });

    if (!product) {
      throw new Error(`Produit "${productCode}" introuvable`);
    }

    // ─── Étape 2 : Séparer les règles ELIGIBILITY des autres ──────
    const eligibilityRules = product.rules.filter(
      (r) => r.type === 'ELIGIBILITY',
    );
    const infoRules = product.rules.filter((r) => r.type !== 'ELIGIBILITY');

    // ─── Étape 3 : Récupérer les métriques analytics du client ─────
    const analyticsMetrics =
      await this.overviewService.gatherMetrics(customerId);

    // ─── Étape 4 : Évaluer les règles d'éligibilité ────────────────
    const ruleResults: RuleResult[] = eligibilityRules.map((rule) => {
      const { value, source } = this.resolveValue(
        rule.field,
        analyticsMetrics,
        clientInputs,
      );
      return this.ruleEvaluator.evaluate(rule, value, source);
    });

    const globalScore = ruleResults.reduce((s, r) => s + r.scoreEarned, 0);
    const maxScore = ruleResults.reduce((s, r) => s + r.scoreMax, 0);
    const scorePercent = maxScore > 0 ? (globalScore / maxScore) * 100 : 0;

    // ─── Étape 5 : Déterminer le statut ────────────────────────────
    //
    // Si aucune règle ELIGIBILITY → produit accessible à tous (éligible par défaut)
    //
    const status: EligibilityResult['status'] =
      eligibilityRules.length === 0
        ? 'ELIGIBLE'
        : scorePercent >= ELIGIBLE_THRESHOLD * 100
          ? 'ELIGIBLE'
          : scorePercent >= PARTIAL_THRESHOLD * 100
            ? 'PARTIAL'
            : 'NOT_ELIGIBLE';

    // ─── Étape 6 : Formater les infos complémentaires (frais, limites, taux) ──
    const infoItems: RuleResult[] = infoRules.map((rule) => {
      const seuil = rule.value?.toLocaleString('fr-FR') ?? '';
      const pct = rule.percentage != null ? `${rule.percentage}%` : '';
      const montant = rule.flatAmount?.toLocaleString('fr-FR') ?? '';
      const periode = rule.period ?? '';

      let detail = '';
      if (rule.flatAmount != null) {
        detail = `${montant} FCFA${periode ? `/${periode}` : ''}`;
      } else if (rule.percentage != null) {
        detail = `${pct}${rule.minAmount ? ` (min ${rule.minAmount.toLocaleString('fr-FR')} FCFA)` : ''}`;
      } else if (rule.value != null) {
        const op =
          (rule.operator as string) === 'GREATER_OR_EQUAL' ? 'max' : 'min';
        detail = `${op === 'max' ? '≤' : '≥'} ${seuil} FCFA`;
      }

      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        label: rule.label,
        status: 'PASS' as const,
        valueSource: 'input' as const,
        clientValue: null,
        threshold: rule.value ?? rule.percentage ?? null,
        thresholdMin: null,
        thresholdMax: null,
        scoreEarned: 0,
        scoreMax: 0,
        message: `${rule.label} : ${detail}`.replace(/ : $/, ''),
        advice: null,
      };
    });

    return {
      productCode: product.code,
      productName: product.name,
      productDescription: product.description ?? '',
      hasEligibilityRules: eligibilityRules.length > 0,
      globalScore: eligibilityRules.length > 0 ? globalScore : maxScore,
      maxScore: eligibilityRules.length > 0 ? maxScore : maxScore || 100,
      scorePercent:
        eligibilityRules.length > 0
          ? Math.round(scorePercent * 100) / 100
          : 100,
      status,
      ruleResults,
      infoRules: infoItems,
      passedRules: ruleResults.filter((r) => r.status === 'PASS'),
      failedRules: ruleResults.filter((r) => r.status === 'FAIL'),
      partialRules: ruleResults.filter((r) => r.status === 'PARTIAL'),
    };
  }

  // ─── Résolution de la valeur d'un champ de règle ──────────────────
  private resolveValue(
    field: string,
    analyticsMetrics: Record<string, any>,
    clientInputs: Record<string, number | boolean | string>,
  ): {
    value: number | boolean | string | null;
    source: RuleResult['valueSource'];
  } {
    if (field in clientInputs) {
      return { value: clientInputs[field], source: 'input' };
    }

    const metricKey = ANALYTICS_FIELD_MAP[field];
    if (metricKey && metricKey in analyticsMetrics) {
      return { value: analyticsMetrics[metricKey], source: 'analytics' };
    }

    return { value: null, source: 'not_found' };
  }
}
