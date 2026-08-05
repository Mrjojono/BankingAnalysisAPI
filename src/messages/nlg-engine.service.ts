import { Injectable, Logger } from '@nestjs/common';
import { DocumentPlanner } from './document-planner';
import type { AdviceIntent, PersonalAdvice } from './intents';
import { interpretIntent } from './interpreter-fallback';

/**
 * NLG Engine v2 — fragment-based composition.
 *
 * Remplace progressivement realizer.ts en utilisant
 * l'architecture NLG en 3 étapes :
 *   1. Document Planning (DocumentPlanner)
 *   2. Fragment Selection (FragmentSelector)
 *   3. Text Realisation (internal)
 *
 * Conçu sans aucun appel LLM externe — embeddings FastText 300d locaux.
 *
 * Supporte le fallback automatique sur realizer.ts si la
 * composition ne produit aucun résultat.
 */
@Injectable()
export class NLGEngineService {
  private readonly logger = new Logger(NLGEngineService.name);

  constructor(private readonly planner: DocumentPlanner) {}

  /**
   * Génère un PersonalAdvice complet à partir d'un AdviceIntent.
   *
   * @param intent - L'intent produit par InterpreterEngine
   * @param fallbackFn - Fonction de fallback (normalement realizer.ts)
   */
  generateFromIntent(
    intent: AdviceIntent,
    fallbackFn?: (intent: AdviceIntent) => PersonalAdvice | null,
  ): PersonalAdvice {
    // Tentative de composition fragment-based
    const composed = this.planner.compose(intent);

    // Si la composition a produit un message valide, on l'utilise
    if (composed.message && composed.message !== 'Information non disponible.') {
      return {
        title: composed.title,
        message: composed.message,
        action: composed.action ?? undefined,
        type: intent.type ?? 'GOOD_HABIT',
        severity: intent.severity,
        category: intent.category,
        metric: {
          current: typeof intent.vars.amount === 'number' ? intent.vars.amount : 0,
          change: typeof intent.vars.change === 'number' ? intent.vars.change : undefined,
          previous: typeof intent.vars.previous === 'number' ? intent.vars.previous : undefined,
          threshold: typeof intent.vars.threshold === 'number' ? intent.vars.threshold : undefined,
        },
      };
    }

    // Fallback
    if (fallbackFn) {
      this.logger.warn(`Fallback realizer pour intent.kind="${intent.kind}"`);
      const fallback = fallbackFn(intent);
      if (fallback) return fallback;
    }

    // Fallback interpréteur
    return interpretIntent(intent);
  }

  /**
   * Méthode stateless qui génère un conseil formaté pour l'affichage.
   * Utilisée par ScoreEngine.
   */
  generateAdvice(score: number, previousScore?: number): PersonalAdvice {
    const intent: AdviceIntent = {
      kind: 'GOOD_HABIT',
      severity: score < 3 ? 'WARNING' : 'INFO',
      category: 'score',
      vars: {
        label: 'Score financier',
        score,
        previousScore: previousScore ?? score,
        change: previousScore !== undefined ? score - previousScore : 0,
        amount: score * 10,
        percent: score * 5,
      },
    };

    const message = this.generateFromIntent(intent);

    return {
      ...message,
      title: score < 3
        ? `Ton score financier est de ${score}/10 — des pistes pour progresser`
        : score < 6
          ? `Ton score financier : ${score}/10`
          : `Super ! Ton score est de ${score}/10`,
    };
  }
}
