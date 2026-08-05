import type { AdviceIntent, PersonalAdvice } from './intents';

/**
 * Fallback minimal quand le NLG Engine et le realizer ne produisent
 * aucun résultat.
 */
export function interpretIntent(intent: AdviceIntent): PersonalAdvice {
  const cat = (intent.vars.catégorie as string) ?? intent.kind;
  const amount = typeof intent.vars.amount === 'number' ? intent.vars.amount : 0;
  const previous = typeof intent.vars.previous === 'number' ? intent.vars.previous : undefined;
  const change = typeof intent.vars.change === 'number' ? intent.vars.change : undefined;

  return {
    type: intent.type ?? 'GOOD_HABIT',
    severity: intent.severity,
    title: `${cat} : point du mois`,
    message: `Au sujet de ${cat}.`,
    action: undefined,
    category: intent.category,
    metric: {
      current: amount,
      previous,
      change,
      threshold: typeof intent.vars.threshold === 'number' ? intent.vars.threshold : undefined,
    },
  };
}
