import { Injectable } from '@nestjs/common';
import { FragmentSelector } from './fragment-selector';
import type { AdviceIntent } from './intents';
import fragments from './catalog-fragments.json';

type CompositionSlot = string;

type CompositionPlan = {
  observations: CompositionSlot[];
  interpretations: CompositionSlot[];
  recommendations: CompositionSlot[];
  encouragements: CompositionSlot[];
};

const compositions = fragments.compositions as Record<
  string,
  {
    severity: Record<string, CompositionSlot[]>;
  }
>;

const ALL_TEMPLATE_SLOTS: (keyof CompositionPlan)[] = [
  'observations',
  'interpretations',
  'recommendations',
  'encouragements',
];

/**
 * Planifie le contenu d'un message à partir d'un intent.
 *
 * 1. Cherche la composition dans catalog-fragments.json par intent.kind + severity
 * 2. Ordonne les fragments (observation → interprétation → recommandation → encouragement)
 * 3. Passe chaque slot au FragmentSelector pour la variante exacte
 */
@Injectable()
export class DocumentPlanner {
  constructor(private readonly selector: FragmentSelector) {}

  /**
   * Génère le message composé pour un intent.
   */
  compose(intent: AdviceIntent): {
    title: string;
    message: string;
    action: string | null;
  } {
    const plan = this.buildPlan(intent);
    const ctxQuery = this.buildContextQuery(intent);

    const fragments: string[] = [];
    const actionFragments: string[] = [];

    for (const group of ALL_TEMPLATE_SLOTS) {
      const slots = plan[group];
      for (const slot of slots) {
        const tpl = this.selector.select(`${group}.${slot}`, ctxQuery);
        if (!tpl) continue;

        const filled = this.fillTemplate(tpl, intent.vars);
        if (!filled) continue;

        if (group === 'recommendations') {
          actionFragments.push(filled);
        }
        fragments.push(filled);
      }
    }

    // Action = première recommandation (ou néant)
    const action = actionFragments.length > 0 ? actionFragments[0] : null;

    // Title
    const title = this.buildTitle(intent);

    // Message = fragments assemblés avec des espaces
    const message = this.assembleMessage(fragments);

    return { title, message, action };
  }

  private buildPlan(intent: AdviceIntent): CompositionPlan {
    const comp = compositions[intent.kind];
    const empty: CompositionPlan = {
      observations: [],
      interpretations: [],
      recommendations: [],
      encouragements: [],
    };

    if (!comp) {
      // Fallback: composition générique basée sur la sévérité
      return this.fallbackPlan(intent);
    }

    const slots = comp.severity[intent.severity] ?? comp.severity['INFO'] ?? [];
    return this.categorizeSlots(slots);
  }

  private fallbackPlan(intent: AdviceIntent): CompositionPlan {
    if (intent.severity === 'CRITICAL') {
      return this.categorizeSlots(['high', 'vs_income', 'reduce_amount', 'keep_going']);
    }
    if (intent.severity === 'WARNING') {
      return this.categorizeSlots(['high', 'above_threshold', 'reduce_amount']);
    }
    return this.categorizeSlots(['ok', 'good']);
  }

  private categorizeSlots(slots: CompositionSlot[]): CompositionPlan {
    const plan: CompositionPlan = {
      observations: [],
      interpretations: [],
      recommendations: [],
      encouragements: [],
    };

    for (const slot of slots) {
      if (catalog.observations[slot]) plan.observations.push(slot);
      else if (catalog.interpretations[slot]) plan.interpretations.push(slot);
      else if (catalog.recommendations[slot]) plan.recommendations.push(slot);
      else if (catalog.encouragements[slot]) plan.encouragements.push(slot);
    }

    return plan;
  }

  private buildTitle(intent: AdviceIntent): string {
    const vars = intent.vars;
    const cat = (vars.catégorie as string) ?? (vars.label as string) ?? intent.kind;
    const amt = typeof vars.amount === 'number' ? vars.amount : 0;
    const pct = typeof vars.percent === 'number' ? vars.percent : typeof vars.change === 'number' ? vars.change : 0;

    const titles: Record<string, string> = {
      LOGEMENT_HIGH: `Logement : ${amt.toLocaleString('fr-FR')} FCFA`,
      LOGEMENT_CRITICAL: `Logement critique : ${amt.toLocaleString('fr-FR')} FCFA`,
      LOGEMENT_OK: 'Logement sous contrôle',
      CREDIT_HIGH: `Crédit : ${amt.toLocaleString('fr-FR')} FCFA`,
      CREDIT_NEAR_LIMIT: `Crédit proche de la limite`,
      CREDIT_INCREASE: `Crédit en hausse`,
      ALIMENTATION_SPIKE: `Alimentation : +${pct}%`,
      ALIMENTATION_HIGH: `Alimentation : ${amt.toLocaleString('fr-FR')} FCFA`,
      TRANSPORT_SPIKE: `Transport : +${pct}%`,
      TRANSPORT_HIGH: `Transport : ${amt.toLocaleString('fr-FR')} FCFA`,
      COMMERCE_SPIKE: `Achats : +${pct}%`,
      CARBURANT_SPIKE: `Carburant : +${pct}%`,
      SANTE_HIGH: `Santé : ${amt.toLocaleString('fr-FR')} FCFA`,
      MOBILE_MONEY_HIGH: `Mobile money : ${amt.toLocaleString('fr-FR')} FCFA`,
      FEES_HIGH: `Frais bancaires élevés`,
      INCOME_DROP: `Baisse de revenus de ${Math.abs(pct)}%`,
      GOOD_HABIT: `Bonnes habitudes financières`,
    };

    return titles[intent.kind] ?? `${cat} : point du mois`;
  }

  private assembleMessage(fragments: string[]): string {
    const cleaned = fragments.filter(Boolean);
    if (cleaned.length === 0) return 'Information non disponible.';

    // Détection du premier fragment : il commence par une majuscule déjà
    // Les fragments suivants : minuscule, séparés par " "
    let result = cleaned[0];
    for (let i = 1; i < cleaned.length; i++) {
      const seg = cleaned[i];
      const first = seg.charAt(0);
      if (first === first.toLowerCase() && first !== first.toUpperCase()) {
        // Commence par minuscule — c'est une continuation
        result += ' ' + seg;
      } else if (result.endsWith('.') || result.endsWith('!') || result.endsWith('?')) {
        result += ' ' + seg;
      } else if (/^[,:]/.test(seg)) {
        result += ' ' + seg;
      } else {
        result += '. ' + seg;
      }
    }

    return this.capitalizeFirst(result);
  }

  private capitalizeFirst(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private fillTemplate(
    tpl: string,
    vars: Record<string, string | number>,
  ): string {
    return tpl.replace(/\{(\w+)\}/g, (_, key: string) => {
      const val = vars[key];
      if (val === undefined || val === null) return `{${key}}`;
      if (typeof val === 'number') {
        if (key === 'pct' || key === 'change' || key === 'percent') {
          return String(Math.round(val));
        }
        if (key === 'montant' || key === 'amount') {
          return Math.round(val).toLocaleString('fr-FR');
        }
        return String(val);
      }
      return String(val);
    });
  }

  private buildContextQuery(intent: AdviceIntent): string {
    const parts: string[] = [intent.kind, intent.severity];
    if (intent.category) parts.push(intent.category);
    if (intent.vars.label) parts.push(String(intent.vars.label));
    if (intent.vars.catégorie) parts.push(String(intent.vars.catégorie));
    return parts.join(' ');
  }
}

const catalog = fragments as any;
