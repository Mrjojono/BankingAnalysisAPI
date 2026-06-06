/** Dictionnaire de synonymes français
 * Utilisé par MessageGenerator avec natural.js pour varier les phrases.
 *
 * Format : [mot, mot, ...] — chaque élément est un synonyme possible.
 * Le générateur choisit aléatoirement (mais déterministe via hash).
 */

export const SYNONYM_GROUPS: Record<string, string[]> = {
  respecte: [
    'respecte',
    'satisfait',
    'remplit',
    'conforme à',
    'dans les clous de',
  ],
  dépasse: ['dépasse', 'excède', 'dépassé', 'franchit', 'outrepasse'],
  insuffisant: [
    'insuffisant',
    'trop bas',
    'en dessous',
    'insuffisant',
    'sous le seuil',
  ],
  suffisant: [
    'suffisant',
    'adéquat',
    'conforme',
    'satisfaisant',
    'dans les normes',
  ],

  plafond: ['plafond', 'limite', 'maximum', 'seuil maximal', 'cap'],
  minimum: ['minimum', 'seuil minimum', 'plancher', 'montant minimal', 'bas'],
  seuil: ['seuil', 'limite', 'plafond', 'barème', 'référence'],

  taux: ['taux', 'ratio', 'niveau', 'proportion', 'indice'],
  montant: ['montant', 'somme', 'valeur', 'capital', 'apport'],

  réduisez: [
    'réduisez',
    'diminuez',
    'baissez',
    'revoyez à la baisse',
    'compresser',
  ],
  augmentez: ['augmentez', 'haussez', 'renforcez', 'développez', 'accroître'],
  épargne: ['épargne', 'mise de côté', 'réserve', 'fonds', 'capital'],
  remboursez: ['remboursez', 'soldez', 'épongez', 'réglez', 'liquidez'],

  alimentation: ['alimentation'],
  logement: ['logement'],
  transport: ['transport'],
  loisirs: ['loisirs'],
  abonnement: ['abonnement', 'souscription', 'contrat', 'adhésion', 'forfait'],

  conseil: ['conseil', 'recommendation', 'suggestion', 'piste'],
  constituez: ['constituez', 'créez', 'bâtissez', 'mettez en place', 'formez'],
  contactez: [
    'contactez',
    'rencontrez',
    'prenez rendez-vous avec',
    'consultez',
  ],
  priorisez: [
    'priorisez',
    'concentrez-vous sur',
    "attaquez d'abord",
    'commencez par',
  ],
};

/**
 * Inverse le synonym mapping pour lookup rapide.
 */
export function buildSynonymLookup(): Map<string, string[]> {
  const lookup = new Map<string, string[]>();
  for (const [canonical, synonyms] of Object.entries(SYNONYM_GROUPS)) {
    for (const word of [...synonyms, canonical]) {
      const lower = word.toLowerCase();
      if (!lookup.has(lower)) {
        lookup.set(lower, []);
      }
      lookup.get(lower)!.push(canonical);
    }
  }
  return lookup;
}

/**
 * Trouve le groupe canonique pour un mot, ou null.
 */
export function findCanonical(word: string): string | null {
  const lower = word.toLowerCase().replace(/[.,!?;:]$/, '');
  for (const [canonical, synonyms] of Object.entries(SYNONYM_GROUPS)) {
    if (canonical === lower || synonyms.some((s) => s === lower)) {
      return canonical;
    }
  }
  return null;
}
