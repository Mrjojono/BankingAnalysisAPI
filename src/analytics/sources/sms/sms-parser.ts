/**
 * Parseur de SMS bancaires (Mobile Money).
 *
 * Extrait le montant, le sens (débit/crédit), l'opérateur, la contrepartie,
 * le solde après opération et la référence de transaction à partir du
 * contenu texte des SMS.
 *
 * Opérateurs supportés (marché togolais) :
 * - MIXX (Yas / ex-TMoney, Togocom)
 * - FLOOZ (Moov Africa Togo)
 * - MOOV (Moov Money)
 * - Autres → UNKNOWN (ignoré sauf pattern très fort sur adresse connue)
 *
 * Fiabilité :
 * - Une adresse émettrice connue (short code) est exigée pour le fallback générique.
 * - Le solde (Solde: X F) et la référence (Ref/ID/N°) sont extraits quand présents.
 * - `buildFingerprint` produit une empreinte stable pour la déduplication
 *   (remplace l'ancien hash à la précision du jour).
 */

export type Direction = 'DEBIT' | 'CREDIT';

export type ParsedSms = {
  operator: string;
  direction: Direction | null;
  amount: number | null;
  sender: string | null;
  counterparty: string | null;
  balanceAfter: number | null;
  referenceNo: string | null;
  confidence: number;
};

type SmsPattern = {
  operator: string;
  regex: RegExp;
  direction: Direction;
  amountGroup: number;
};

export function getPatternStats() {
  const operators = [...new Set(PATTERNS.map((p) => p.operator))];
  return {
    total: PATTERNS.length,
    operators,
    creditCount: PATTERNS.filter((p) => p.direction === 'CREDIT').length,
    debitCount: PATTERNS.filter((p) => p.direction === 'DEBIT').length,
  };
}

/**
 * Adresses émettrices connues (short codes) par opérateur.
 * Un SMS provenant d'une adresse reconnue est traité en confiance ;
 * les autres ne sont acceptés que s'ils correspondent à un pattern très fort.
 */
export const OPERATOR_ADDRESS_TOKENS: Record<string, string[]> = {
  MIXX: ['MIXX', 'MIXTONE', 'YAS', 'TMONEY', 'TOGOCOM', 'TOGOCEL'],
  FLOOZ: ['FLOOZ', 'MOOVFLOOZ'],
  MOOV: ['MOOVMONEY', 'MOOV MONEY', 'MOOV', 'MTN'],
  ORABANK: ['ORABANK'],
};

const PATTERNS: SmsPattern[] = [
  // ===== MIXX (ex-TMoney / Yas) =====
  // Réception
  { operator: 'MIXX', regex: /(?:VOUS AVEZ RECU|RECU)\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'CREDIT', amountGroup: 1 },
  // Paiement
  { operator: 'MIXX', regex: /PAIEMENT\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'DEBIT', amountGroup: 1 },
  // Transfert
  { operator: 'MIXX', regex: /TRANSFERT\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'DEBIT', amountGroup: 1 },
  // Achat crédit
  { operator: 'MIXX', regex: /ACHAT CREDIT\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'DEBIT', amountGroup: 1 },
  // Retrait
  { operator: 'MIXX', regex: /RETRAIT\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'DEBIT', amountGroup: 1 },

  // ===== FLOOZ (Moov Africa Togo) =====
  { operator: 'FLOOZ', regex: /(?:RECU|VOUS AVEZ RECU)\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'CREDIT', amountGroup: 1 },
  { operator: 'FLOOZ', regex: /ENVOYE\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'DEBIT', amountGroup: 1 },
  { operator: 'FLOOZ', regex: /PAIEMENT\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'DEBIT', amountGroup: 1 },
  { operator: 'FLOOZ', regex: /RETRAIT\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'DEBIT', amountGroup: 1 },

  // ===== MOOV Money =====
  { operator: 'MOOV', regex: /(?:RECU|VOUS AVEZ RECU)\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'CREDIT', amountGroup: 1 },
  { operator: 'MOOV', regex: /ENVOYE\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'DEBIT', amountGroup: 1 },
  { operator: 'MOOV', regex: /PAIEMENT\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'DEBIT', amountGroup: 1 },
  { operator: 'MOOV', regex: /RETRAIT\s+(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i, direction: 'DEBIT', amountGroup: 1 },
];

/** Verbes financiers forts — exigés par le fallback générique. */
const STRONG_DEBIT = /DEBIT|PAIEMENT|ENVOYE|ENVOI|RETRAIT|ACHAT|FACTURE|TRANSFERT/i;
const STRONG_CREDIT = /CREDIT|RECU|VIREMENT|DEPOT|SALAIRE/i;

/**
 * Parse un SMS bancaire pour en extraire les informations.
 *
 * @param address - Numéro/identifiant de l'expéditeur
 * @param body - Contenu textuel du SMS
 * @returns Informations parsées ou valeurs par défaut
 */
export function parseSms(address: string, body: string): ParsedSms {
  const upper = body.toUpperCase().trim();
  // Normalisation des accents pour le matching ("reçu" → "recu", "débit" → "debit").
  // L'extraction de la contrepartie utilise `upper` (accents préservés).
  const norm = stripAccents(upper);
  const addressOperator = guessOperatorFromAddress(address);

  // 1. Pattern opérateur explicite (adresse connue OU contenu très marqué)
  for (const p of PATTERNS) {
    if (addressOperator && addressOperator !== p.operator) continue;
    const match = norm.match(p.regex);
    if (match) {
      const raw = match[p.amountGroup]?.replace(/[\s.,]/g, '');
      const amount = raw ? parseInt(raw, 10) : null;
      if (amount === null || Number.isNaN(amount)) continue;
      const counterparty = extractCounterparty(upper, p.operator);
      return {
        operator: p.operator,
        direction: p.direction,
        amount,
        sender: counterparty,
        counterparty,
        balanceAfter: extractBalance(upper),
        referenceNo: extractReference(upper),
        confidence: addressOperator === p.operator ? 1 : 0.8,
      };
    }
  }

  // 2. Fallback générique — seulement si l'adresse est reconnue (short code)
  const hasAmount = norm.match(/(\d[\d .,]*)\s*(?:F(?:CFA)?|CFA)\b/i);
  if (!hasAmount) {
    return {
      operator: addressOperator ?? 'UNKNOWN',
      direction: null,
      amount: null,
      sender: null,
      counterparty: null,
      balanceAfter: null,
      referenceNo: null,
      confidence: 0,
    };
  }

  const amount = parseInt(hasAmount[1].replace(/[\s.,]/g, ''), 10);
  const isCredit = STRONG_CREDIT.test(norm) && !STRONG_DEBIT.test(norm);
  const isDebit = STRONG_DEBIT.test(norm) && !STRONG_CREDIT.test(norm);

  if (!addressOperator || (!isCredit && !isDebit)) {
    return {
      operator: addressOperator ?? 'UNKNOWN',
      direction: null,
      amount: null,
      sender: null,
      counterparty: null,
      balanceAfter: null,
      referenceNo: null,
      confidence: 0,
    };
  }

  const direction: Direction = isCredit ? 'CREDIT' : 'DEBIT';
  const counterparty = extractCounterparty(upper, addressOperator);
  return {
    operator: addressOperator,
    direction,
    amount: Number.isNaN(amount) ? null : amount,
    sender: counterparty,
    counterparty,
    balanceAfter: extractBalance(upper),
    referenceNo: extractReference(upper),
    confidence: 0.8,
  };
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Identifie l'opérateur depuis l'adresse émettrice (short code).
 */
export function guessOperatorFromAddress(address: string): string | null {
  const addr = address.toUpperCase();
  for (const [operator, tokens] of Object.entries(OPERATOR_ADDRESS_TOKENS)) {
    for (const token of tokens) {
      if (addr.includes(token)) return operator;
    }
  }
  // Toute adresse inconnue commençant par un numéro court à 5 chiffres
  // peut être un short code opérateur, mais on ne le suppose pas.
  return null;
}

/**
 * Extrait le solde après opération (ex. "Solde: 150000 FCFA").
 */
export function extractBalance(text: string): number | null {
  const m = text.match(/SOLDE\s*[:=]?\s*(\d[\d ,.]*)\s*(?:F(?:CFA)?|CFA)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/[\s.,]/g, ''));
  return Number.isNaN(n) ? null : n;
}

/**
 * Extrait la référence de transaction (ex. "Ref: 2345", "N°: ABC123", "ID transaction: ...").
 */
export function extractReference(text: string): string | null {
  const patterns = [
    /(?:REF(?:ERENCE)?|N°|NO|ID TRANSACTION|TRANSACTION ID|CODE)\s*[:.]?\s*([A-Z0-9-]{4,})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

/**
 * Extrait la contrepartie (nom du tiers) du message.
 */
export function extractCounterparty(text: string, operator: string): string | null {
  const patterns: Record<string, RegExp> = {
    MIXX: /(?:DE LA PART DE|DE)\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿ' -]{1,60}?)(?:\s+(?:LE|POUR|NUMERO|N°|REF|SOLDE|VOUS))?(?=\.|\s+(?:LE|POUR|NUMERO|N°|REF|SOLDE)|$)/i,
    FLOOZ: /DE LA PART DE\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿ' -]{1,60}?)(?:\s+(?:LE|POUR|NUMERO|N°|REF|SOLDE))?(?=\.|\s+(?:LE|POUR|NUMERO|N°|REF|SOLDE)|$)/i,
    MOOV: /(?:DE LA PART DE|DE)\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿ' -]{1,60}?)(?:\s+(?:LE|POUR|NUMERO|N°|REF|SOLDE))?(?=\.|\s+(?:LE|POUR|NUMERO|N°|REF|SOLDE)|$)/i,
  };

  const regex = patterns[operator];
  if (regex) {
    const match = text.match(regex);
    if (match?.[1]) return match[1].trim().replace(/\.$/, '');
  }

  // Générique
  const generic = text.match(/(?:DE LA PART DE|DE|FROM)\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿ' -]{1,60}?)(?=\.|\s+(?:LE|POUR|NUMERO|N°|REF|SOLDE)|$)/i);
  if (generic?.[1]) return generic[1].trim().replace(/\.$/, '');

  return null;
}

/**
 * Empreinte stable de déduplication d'une transaction.
 *
 * Utilise la référence quand elle existe, sinon un composite
 * opérateur|sens|montant|contrepartie|minute. Résout le bug de l'ancien hash
 * journalier qui ignorait deux transferts identiques le même jour.
 */
export function buildFingerprint(
  parsed: Pick<ParsedSms, 'operator' | 'direction' | 'amount' | 'counterparty'> & {
    referenceNo?: string | null;
  },
  dateSent: Date,
): string {
  const minute = dateSent.toISOString().slice(0, 16);
  const counterparty = (parsed.counterparty ?? '').toLowerCase().trim() || '?';
  return [
    parsed.referenceNo
      ? `ref:${parsed.referenceNo}`
      : `${parsed.operator}|${parsed.direction}|${parsed.amount ?? '?'}|${counterparty}|${minute}`,
    dateSent.toISOString().slice(0, 10),
  ].join('#');
}
