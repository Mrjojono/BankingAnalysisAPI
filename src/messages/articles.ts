/**
 * articles.ts — Articles français pour les noms de catégories
 *
 * Permet de générer automatiquement "le logement", "la santé",
 * "l'alimentation", "les crédits" selon le genre du mot.
 */

const VOWEL_START = /^[aeiouyêéèëêîïôûùü]/i;

// Genre des catégories de dépenses
const CATEGORY_GENDER: Record<string, 'm' | 'f' | 'mp' | 'fp'> = {
  LOGEMENT: 'm',
  ALIMENTATION: 'f',
  TRANSPORT: 'm',
  SANTÉ: 'f',
  SANTE: 'f',
  MOBILE_MONEY: 'm',
  CARBURANT: 'm',
  COMMERCE: 'm',
  FRAIS_BANCAIRES: 'mp',
  VIREMENTS: 'mp',
  RETRAITS: 'mp',
  CREDIT: 'm',
  CRÉDIT: 'm',
  CREDITS: 'mp',
  CRÉDITS: 'mp',
  DIVERS: 'mp',
  LOISIRS: 'mp',
  SALAIRE: 'm',
  REVENU: 'm',
  DÉPÔTS: 'mp',
  DEPOTS: 'mp',
  INTÉRÊTS: 'mp',
  INTERETS: 'mp',
};

export function getArticle(category: string): string {
  const cat = category.toUpperCase();
  const gender = CATEGORY_GENDER[cat];

  if (gender === 'mp' || gender === 'fp') return 'les';

  const startsWithVowel = VOWEL_START.test(category);
  if (startsWithVowel) return "l'";

  if (gender === 'f') return 'la';
  return 'le';
}

export function withArticle(category: string): string {
  const article = getArticle(category);
  if (article === "l'") return `l'${category.toLowerCase()}`;
  return `${article} ${category.toLowerCase()}`;
}

/**
 * Détecte si un mot français commence par une voyelle (pour l'élision)
 */
export function startsWithVowel(word: string): boolean {
  return VOWEL_START.test(word);
}
