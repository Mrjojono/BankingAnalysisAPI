import { Injectable, Optional } from '@nestjs/common';
import type { AdviceIntent } from '../../messages/intents';
import type { RuleContext } from '../engines/interpreter.engine';
import { buildFeatureVector } from './context-vector.builder';
import { buildWeightMatricesDeep, loadOrBuildWeights } from './intent-matrix';
import {
  computeScores,
  computeScoresDeep,
  selectActiveIntents,
} from './scoring-engine';
import type { ScoredIntent, DeepWeightMatrices } from './types';
import { TextVectorizer } from '../embeddings/text-vectorizer';

/**
 * Nouvel interpréteur basé sur le calcul matriciel.
 *
 * MÊME INTERFACE que InterpreterEngine :
 *   interpret(ctx: RuleContext): AdviceIntent[]
 *
 * Donc on peut remplacer l'ancien sans rien casser.
 * AdviceEngine ne voit pas la différence.
 */
@Injectable()
export class MatrixInterpreterEngine {
  private readonly weightMatrix = loadOrBuildWeights();
  private deepMatrices: DeepWeightMatrices | null = null;

  constructor(@Optional() private readonly textVectorizer?: TextVectorizer) {}

  /**
   * Point d'entrée unique (même signature que l'InterpreterEngine actuel).
   *
   * 1. Transforme le contexte en vecteur numérique (+ embeddings si disponibles)
   * 2. Multiplie le vecteur par la matrice des poids → scores (1 couche ou 2 couches)
   * 3. Filtre les intentions qui dépassent le seuil
   * 4. Convertit les intents scorés en AdviceIntent (format attendu par le Realizer)
   */
  interpret(ctx: RuleContext): AdviceIntent[] {
    // ── 1. Feature vector (avec embeddings NLP si disponibles) ──
    const embeddingVector = this.computeEmbedding(ctx);
    const vector = buildFeatureVector(ctx, embeddingVector);

    // ── 2. Produit matriciel (1 couche ou 2 couches) ──
    const useDeep = embeddingVector !== undefined && vector.length > 21;
    let scores: ScoredIntent[];

    if (useDeep) {
      const matrices = this.getOrBuildDeepMatrices();
      scores = computeScoresDeep(vector, matrices.W1, matrices.W2);
    } else {
      scores = computeScores(vector, this.weightMatrix);
    }

    // ── 3. Sélection des meilleurs scores ──
    const actives = selectActiveIntents(scores);

    // ── 4. Conversion en AdviceIntent ──
    return actives.map((scored) => this.scoredIntentToAdvice(scored, ctx));
  }

  /**
   * Calcule le vecteur d'embedding à partir des descriptions
   * si TextVectorizer est disponible et que le contexte a des descriptions.
   */
  private computeEmbedding(ctx: RuleContext): Float32Array | undefined {
    if (!this.textVectorizer) return undefined;
    const descriptions = (ctx as any).descriptions;
    if (
      !descriptions ||
      !Array.isArray(descriptions) ||
      descriptions.length === 0
    ) {
      return undefined;
    }
    return this.textVectorizer.average(descriptions);
  }

  /**
   * Construit (ou récupère) les matrices 2 couches pour les embeddings NLP.
   */
  private getOrBuildDeepMatrices(): DeepWeightMatrices {
    if (!this.deepMatrices) {
      this.deepMatrices = buildWeightMatricesDeep();
    }
    return this.deepMatrices;
  }

  /**
   * Convertit un ScoredIntent + RuleContext en AdviceIntent.
   * C'est l'équivalent des fonctions `intent: (ctx) => ({...})` dans l'ancien système.
   */
  private scoredIntentToAdvice(
    scored: ScoredIntent,
    ctx: RuleContext,
  ): AdviceIntent {
    const kind = scored.kind;

    // Construction des vars partagées
    const vars: Record<string, string | number> = {
      amount: ctx.amount,
      percent: ctx.percent,
      change: ctx.change ?? 0,
      prev_amount: ctx.prevAmount,
      threshold: 0,
      label: ctx.label,
    };

    // Cas particulier selon le kind
    switch (kind) {
      case 'LOGEMENT_CRITICAL':
        return {
          kind: 'LOGEMENT_CRITICAL',
          severity: 'WARNING',
          type: 'TOP_CATEGORY',
          category: 'LOGEMENT',
          vars: { ...vars, threshold: 35 },
        };

      case 'LOGEMENT_HIGH':
        return {
          kind: 'LOGEMENT_HIGH',
          severity: 'WARNING',
          type: 'TOP_CATEGORY',
          category: 'LOGEMENT',
          vars: { ...vars, threshold: 35 },
        };

      case 'LOGEMENT_OK':
        return {
          kind: 'LOGEMENT_OK',
          severity: 'INFO',
          type: 'TOP_CATEGORY',
          category: 'LOGEMENT',
          vars: { ...vars, threshold: 35 },
        };

      case 'CREDIT_HIGH':
        return {
          kind: 'CREDIT_HIGH',
          severity: 'WARNING',
          type: 'DEBT_WARNING',
          category: 'CREDIT',
          vars: { ...vars, threshold: 33 },
        };

      case 'CREDIT_NEAR_LIMIT':
        return {
          kind: 'CREDIT_NEAR_LIMIT',
          severity: 'INFO',
          type: 'DEBT_WARNING',
          category: 'CREDIT',
          vars: { ...vars, threshold: 33 },
        };

      case 'CREDIT_INCREASE':
        return {
          kind: 'CREDIT_INCREASE',
          severity: 'WARNING',
          type: 'DEBT_WARNING',
          category: 'CREDIT',
          vars: { ...vars, threshold: 33 },
        };

      case 'ALIMENTATION_SPIKE':
        return {
          kind: 'ALIMENTATION_SPIKE',
          severity: 'WARNING',
          type: 'SPENDING_SPIKE',
          category: 'ALIMENTATION',
          vars: { ...vars },
        };

      case 'ALIMENTATION_HIGH':
        return {
          kind: 'ALIMENTATION_HIGH',
          severity: 'INFO',
          type: 'TOP_CATEGORY',
          category: 'ALIMENTATION',
          vars: { ...vars, threshold: 30 },
        };

      case 'TRANSPORT_SPIKE':
        return {
          kind: 'TRANSPORT_SPIKE',
          severity: 'WARNING',
          type: 'SPENDING_SPIKE',
          category: 'TRANSPORT',
          vars: { ...vars },
        };

      case 'TRANSPORT_HIGH':
        return {
          kind: 'TRANSPORT_HIGH',
          severity: 'WARNING',
          type: 'TOP_CATEGORY',
          category: 'TRANSPORT',
          vars: { ...vars, threshold: 15 },
        };

      case 'COMMERCE_SPIKE':
        return {
          kind: 'COMMERCE_SPIKE',
          severity: 'WARNING',
          type: 'SPENDING_SPIKE',
          category: ctx.category,
          vars: { ...vars },
        };

      case 'CARBURANT_SPIKE':
        return {
          kind: 'CARBURANT_SPIKE',
          severity: 'WARNING',
          type: 'SPENDING_SPIKE',
          category: 'CARBURANT',
          vars: { ...vars },
        };

      case 'SANTE_HIGH':
        return {
          kind: 'SANTE_HIGH',
          severity: 'INFO',
          type: 'SPENDING_SPIKE',
          category: 'SANTE',
          vars: { ...vars },
        };

      case 'MOBILE_MONEY_HIGH':
        return {
          kind: 'MOBILE_MONEY_HIGH',
          severity: 'INFO',
          type: 'SPENDING_SPIKE',
          category: 'MOBILE_MONEY',
          vars: { ...vars },
        };

      case 'FEES_HIGH':
        return {
          kind: 'FEES_HIGH',
          severity: ctx.amount > 25000 ? 'CRITICAL' : 'WARNING',
          type: 'OVERDRAFT_RISK',
          category: 'FRAIS_BANCAIRES',
          vars: { ...vars },
        };

      case 'INCOME_DROP':
        return {
          kind: 'INCOME_DROP',
          severity: 'CRITICAL',
          type: 'INCOME_DROP',
          category: 'SALAIRE',
          vars: { ...vars, percent: Math.abs(ctx.change ?? 0) },
        };

      case 'GOOD_HABIT':
        return {
          kind: 'GOOD_HABIT',
          severity: 'INFO',
          type: 'GOOD_HABIT',
          category: 'ALIMENTATION',
          vars: { ...vars },
        };

      default:
        // Fallback : si le kind n'est pas reconnu, on ne retourne rien
        return {
          kind: 'GOOD_HABIT',
          severity: 'INFO',
          type: 'GOOD_HABIT',
          vars: { ...vars },
        };
    }
  }
}
