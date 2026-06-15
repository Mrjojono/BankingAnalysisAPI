/**
 *
 * Lit catalog.json, remplit les variables, applique articles + grammaire + synonymes.
 * Remplace message-generator.ts, patterns.ts, message-builder.ts.
 */

import catalog from './catalog.json';
import type {
  AdviceIntent,
  EligibilityIntent,
  AdviceTemplateKind,
  PersonalAdvice,
} from './intents';
import { getArticle } from './articles';
import { findCanonical, SYNONYM_GROUPS } from './synonyms';

function stableHash(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) & 0x7fffffff;
  }
  return h;
}

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function applySynonyms(text: string, seed: number): string {
  const tokens = tokenize(text);
  if (tokens.length === 0) return text;

  const result: string[] = [];
  let idx = 0;

  for (const token of tokens) {
    const clean = token.replace(/[.,!?;:…]+$/, '');
    const punct = token.slice(clean.length);

    if (!/^[a-zA-ZàâçéèêëîïôûùüÿñæœÀÂÇÉÈÊËÎÏÔÛÙÜŸÑÆŒ-]{3,}$/.test(clean)) {
      result.push(token);
      continue;
    }

    const lower = clean.toLowerCase();
    const canonical = findCanonical(lower);
    if (canonical) {
      const group = SYNONYM_GROUPS[canonical];
      if (group && group.length > 0) {
        const choice =
          group[
            stableHash(lower + String(seed) + String(idx), 0) % group.length
          ];
        result.push(choice + punct);
        idx++;
        continue;
      }
    }
    result.push(token);
  }

  return result.join(' ');
}

function correctFrench(text: string): string {
  return text
    .replace(/\bde le\b/g, 'du')
    .replace(/\bde les\b/g, 'des')
    .replace(/\bà le\b/g, 'au')
    .replace(/\bà les\b/g, 'aux')
    .trim();
}

// ─── Template ─────────────────────────────────────────────────────────
function fillTemplate(
  tpl: string,
  vars: Record<string, string | number>,
): string {
  const ctx: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    ctx[k] = typeof v === 'number' ? v.toLocaleString('fr-FR') : v;
  }
  return tpl.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? `{${key}}`);
}

// ─── Labels ───────────────────────────────────────────────────────────
const LABELS = catalog.labels as Record<
  string,
  { label: string; article: string }
>;

export function getCategoryLabel(category: string): string {
  return LABELS[category.toUpperCase()]?.label ?? category.toLowerCase();
}

export function getCategoryArticle(category: string): string {
  return LABELS[category.toUpperCase()]?.article ?? getArticle(category);
}

export function withCategoryArticle(category: string): string {
  const info = LABELS[category.toUpperCase()];
  if (!info) {
    const article = getArticle(category);
    if (article === "l'") return `l'${category.toLowerCase()}`;
    return `${article} ${category.toLowerCase()}`;
  }
  if (info.article === "l'") return `l'${info.label}`;
  return `${info.article} ${info.label}`;
}

// ─── Advice intents → PersonalAdvice ────────────────────────────────
export function realizeIntent(
  intent: AdviceIntent,
  seed?: number,
): PersonalAdvice {
  const s = seed ?? stableHash(JSON.stringify(intent.vars), 0);
  const entry = (catalog.interpreter as Record<string, any>)[intent.kind];
  if (!entry) {
    return {
      type: 'GOOD_HABIT',
      severity: intent.severity,
      title: intent.kind,
      message: 'Information non disponible.',
      metric: { current: 0 },
    };
  }

  const title = fillTemplate(entry.title, intent.vars);
  const templates: string[] = entry.templates;
  const tpl =
    templates.length > 0
      ? templates[stableHash(intent.kind + String(s), 0) % templates.length]
      : (templates[0] ?? '');

  let message = fillTemplate(tpl, intent.vars);
  message = correctFrench(message);
  message = applySynonyms(message, s + 1);

  const actions: (string | null)[] = entry.actions;
  let action: string | undefined;
  if (actions && actions.length > 0) {
    const act = actions[stableHash(intent.kind + 'act', 0) % actions.length];
    if (act) {
      action = fillTemplate(act, intent.vars);
      action = correctFrench(action);
      action = applySynonyms(action, s + 2);
    }
  }

  return {
    type: intent.type ?? 'TOP_CATEGORY',
    severity: intent.severity,
    title,
    message,
    action,
    category: intent.category,
    metric: {
      current: typeof intent.vars.amount === 'number' ? intent.vars.amount : 0,
      change:
        typeof intent.vars.change === 'number' ? intent.vars.change : undefined,
      threshold:
        typeof intent.vars.threshold === 'number'
          ? intent.vars.threshold
          : undefined,
    },
  };
}

export function renderAdviceTemplate(
  kind: AdviceTemplateKind,
  vars: Record<string, string | number>,
  seed?: number,
): string {
  const s = seed ?? 0;
  const templates = (catalog.advice_templates as Record<string, string[]>)[
    kind
  ];
  if (!templates || templates.length === 0) return '';

  const tpl = templates[stableHash(kind + String(s), 0) % templates.length];
  let result = fillTemplate(tpl, vars);
  result = correctFrench(result);
  result = applySynonyms(result, s + 10);
  return result;
}

export function realizeScoreLabel(score: number, seed?: number): string {
  const s = seed ?? stableHash(String(score), 42);
  const labels = (catalog as any).score_labels as Record<string, string[]>;

  let kind: string;
  if (score >= 80) kind = 'EXCELLENT';
  else if (score >= 60) kind = 'GOOD';
  else if (score >= 40) kind = 'FRAGILE';
  else kind = 'CRITICAL';

  const templates = labels[kind];
  if (!templates || templates.length === 0) {
    return `Score : ${score}/100`;
  }

  const tpl = templates[stableHash(kind + String(s), 0) % templates.length];
  let result = fillTemplate(tpl, { score });
  result = correctFrench(result);
  result = applySynonyms(result, s + 1);
  return result;
}

export function realizeScoreInterpretation(
  componentName: string,
  score: number,
): {
  level: 'CRITIQUE' | 'FAIBLE' | 'MOYEN' | 'BON' | 'EXCELLENT';
  label: string;
  message: string;
  priorities: string[];
} {
  const level =
    score >= 80
      ? 'EXCELLENT'
      : score >= 60
        ? 'BON'
        : score >= 40
          ? 'MOYEN'
          : score >= 20
            ? 'FAIBLE'
            : 'CRITIQUE';

  const interpretations = (catalog as any).score_interpretations as Record<
    string,
    {
      label: string;
      levels: Record<
        string,
        { label: string; message: string; priorities: string[] }
      >;
    }
  >;

  const component = interpretations[componentName];
  const levelData = component?.levels?.[level];

  if (!levelData) {
    return {
      level,
      label: componentName,
      message: `Score ${componentName} : ${score}/100`,
      priorities: [],
    };
  }

  return { level, ...levelData };
}

export function realizeEligibilityIntent(
  intent: EligibilityIntent,
  ruleId: string,
): { message: string; advice: string | null } {
  const entry = (catalog.eligibility as Record<string, any>)[intent.kind];
  if (!entry) {
    return {
      message: `${intent.label} : ${intent.value} ${intent.unit} — condition ${intent.status === 'PASS' ? 'remplie' : 'non remplie'}.`,
      advice: null,
    };
  }

  const templates: string[] = (() => {
    if (intent.status === 'PASS') return entry.pass;
    if (intent.status === 'FAIL') return entry.fail;
    return entry.partial;
  })();

  const tpl =
    templates.length > 0
      ? templates[stableHash(ruleId + intent.status, 0) % templates.length]
      : (catalog.eligibility as any).UNKNOWN.pass[0];

  const ctx = {
    label: intent.label,
    unit: intent.unit,
    value: intent.value + (intent.sourceNote ?? ''),
    threshold: intent.threshold,
    min: intent.min ?? '',
    max: intent.max ?? '',
    gap: intent.gap ?? '',
  };

  let message = fillTemplate(tpl, ctx);
  message = correctFrench(message);
  message = applySynonyms(message, stableHash(ruleId, 42));

  let advice: string | null = null;
  if (intent.status === 'FAIL') {
    const gap = intent.gap ? Number(intent.gap.replace(/\D/g, '')) : 0;
    if (gap > 0) {
      const advTemplates =
        entry.advice.length > 0
          ? entry.advice
          : (catalog.eligibility as any).UNKNOWN.advice;
      const advTpl =
        advTemplates[stableHash(ruleId + 'advice', 0) % advTemplates.length];
      ctx.gap = intent.gap ?? '';
      advice = fillTemplate(advTpl, ctx);
      advice = correctFrench(advice);
      advice = applySynonyms(advice, stableHash(ruleId, 99));
    }
  }

  return { message, advice };
}
