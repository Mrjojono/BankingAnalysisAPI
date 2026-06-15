import {
  GlobalScoreResponse,
  ScoreExplanationResponse,
  ScoreHistoryResponse,
  ScoreIndicator,
  ScoreHistoryItem,
  ScoreMetrics,
} from '../types';
import Decimal from 'decimal.js';
import { Injectable } from '@nestjs/common';
import {
  realizeScoreLabel,
  realizeScoreInterpretation,
} from '../../messages/realizer';

@Injectable()
export class ScoreEngine {
  /**
   * Calcule le score global selon la formule hybride.
   */
  async calculateGlobalScore(
    metrics: ScoreMetrics,
  ): Promise<GlobalScoreResponse> {
    // C1 = (score ratio dépenses × 50%) + (score régularité paiements × 50%)
    const c1Score = new Decimal(metrics.expenseRatioScore)
      .mul(0.5)
      .plus(new Decimal(metrics.paymentRegularityScore).mul(0.5))
      .toDP(0)
      .toNumber();

    // C2 = (score endettement × 40%) + (score régularité remboursements × 35%) + (score utilisation crédit × 25%)
    const c2Score = new Decimal(metrics.debtRatioScore)
      .mul(0.4)
      .plus(new Decimal(metrics.repaymentRegularityScore).mul(0.35))
      .plus(new Decimal(metrics.creditUtilizationScore).mul(0.25))
      .toDP(0)
      .toNumber();

    // C3 = (score taux épargne × 50%) + (score fonds urgence × 30%) + (score régularité épargne × 20%)
    const c3Score = new Decimal(metrics.savingsRateScore)
      .mul(0.5)
      .plus(new Decimal(metrics.emergencyFundScore).mul(0.3))
      .plus(new Decimal(metrics.savingsRegularityScore).mul(0.2))
      .toDP(0)
      .toNumber();

    // C4 = (score découverts × 40%) + (score volatilité revenus × 35%) + (score volatilité solde × 25%)
    const c4Score = new Decimal(metrics.overdraftScore)
      .mul(0.4)
      .plus(new Decimal(metrics.revenueVolatilityScore).mul(0.35))
      .plus(new Decimal(metrics.balanceVolatilityScore).mul(0.25))
      .toDP(0)
      .toNumber();

    const globalScore = new Decimal(c1Score)
      .mul(0.25)
      .plus(new Decimal(c2Score).mul(0.25))
      .plus(new Decimal(c3Score).mul(0.25))
      .plus(new Decimal(c4Score).mul(0.25))
      .toDP(0)
      .toNumber();

    return {
      globalScore,
      label: this.getScoreLabel(globalScore),
      components: {
        C1_expenses: {
          score: c1Score,
          weight: 0.25,
          contribution: new Decimal(c1Score).mul(0.25).toNumber(),
        },
        C2_debt: {
          score: c2Score,
          weight: 0.25,
          contribution: new Decimal(c2Score).mul(0.25).toNumber(),
        },
        C3_savings: {
          score: c3Score,
          weight: 0.25,
          contribution: new Decimal(c3Score).mul(0.25).toNumber(),
        },
        C4_stability: {
          score: c4Score,
          weight: 0.25,
          contribution: new Decimal(c4Score).mul(0.25).toNumber(),
        },
      },
      methodology:
        'CFPB + Financial Health Network + FICO + Garman & Forgue + BCEAO',
      interpretations: this.interpretComponents({
        C1_expenses: c1Score,
        C2_debt: c2Score,
        C3_savings: c3Score,
        C4_stability: c4Score,
      }),
    };
  }

  interpretComponents(scores: {
    C1_expenses: number;
    C2_debt: number;
    C3_savings: number;
    C4_stability: number;
  }): GlobalScoreResponse['interpretations'] {
    return {
      C1_expenses: realizeScoreInterpretation(
        'C1_expenses',
        scores.C1_expenses,
      ),
      C2_debt: realizeScoreInterpretation('C2_debt', scores.C2_debt),
      C3_savings: realizeScoreInterpretation('C3_savings', scores.C3_savings),
      C4_stability: realizeScoreInterpretation(
        'C4_stability',
        scores.C4_stability,
      ),
    };
  }

  /**
   * Retourne le label correspondant au score.
   */
  getScoreLabel(score: number): string {
    return realizeScoreLabel(score);
  }

  /**
   * Génère l'explication du score.
   */
  async explainScore(
    globalScore: number,
    indicators: ScoreIndicator[],
  ): Promise<ScoreExplanationResponse> {
    const strengths = indicators
      .filter((i) => i.impact === 'POSITIF')
      .map((i) => i.name + ': ' + i.value);
    const weaknesses = indicators
      .filter((i) => i.impact === 'NEGATIF')
      .map((i) => i.name + ': ' + i.value);

    return {
      globalScore,
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
      indicators,
    };
  }

  /**
   * Calcule l'évolution et la tendance.
   */
  async calculateHistory(
    history: ScoreHistoryItem[],
  ): Promise<ScoreHistoryResponse> {
    if (history.length < 2) {
      return {
        history,
        trend: 'STABLE',
        improvement: '0 points',
      };
    }

    const first = history[0].score;
    const last = history[history.length - 1].score;
    const diff = last - first;

    return {
      history,
      trend: diff > 2 ? 'UP' : diff < -2 ? 'DOWN' : 'STABLE',
      improvement: `${diff > 0 ? '+' : ''}${diff} points sur ${history.length} mois`,
    };
  }
}
