/**
 * Parseur de SMS bancaires (Mobile Money).
 *
 * Extrait le montant, le sens (débit/crédit) et l'opérateur
 * à partir du contenu texte des SMS.
 *
 * Opérateurs supportés :
 * - TMoney (Togocel)
 * - Flooz (Moov)
 * - Moov MTN / Moov Money
 * - Autres → UNKNOWN
 */

export type ParsedSms = {
  operator: string;
  direction: 'DEBIT' | 'CREDIT' | null;
  amount: number | null;
  sender: string | null;
};

const PATTERNS: {
  operator: string;
  regex: RegExp;
  direction: 'DEBIT' | 'CREDIT';
  amountGroup: number;
}[] = [
  // TMoney — Réception
  { operator: 'TMONEY', regex: /VOUS AVEZ RECU (\d[\d ]*) F/i, direction: 'CREDIT', amountGroup: 1 },
  // TMoney — Paiement
  { operator: 'TMONEY', regex: /PAIEMENT (\d[\d ]*) F/i, direction: 'DEBIT', amountGroup: 1 },
  // TMoney — Transfert
  { operator: 'TMONEY', regex: /TRANSFERT (\d[\d ]*) F/i, direction: 'DEBIT', amountGroup: 1 },
  // TMoney — Achat crédit
  { operator: 'TMONEY', regex: /ACHAT CREDIT (\d[\d ]*) F/i, direction: 'DEBIT', amountGroup: 1 },
  // Flooz — Réception
  { operator: 'FLOOZ', regex: /RECU (\d[\d ]*) F/i, direction: 'CREDIT', amountGroup: 1 },
  // Flooz — Envoi
  { operator: 'FLOOZ', regex: /ENVOYE (\d[\d ]*) F/i, direction: 'DEBIT', amountGroup: 1 },
  // Flooz — Paiement
  { operator: 'FLOOZ', regex: /PAIEMENT (\d[\d ]*) F/i, direction: 'DEBIT', amountGroup: 1 },
  // Moov MTN — Réception
  { operator: 'MOOV', regex: /RECU (\d[\d ]*) F/i, direction: 'CREDIT', amountGroup: 1 },
  // Moov MTN — Envoi
  { operator: 'MOOV', regex: /ENVOYE (\d[\d ]*) F/i, direction: 'DEBIT', amountGroup: 1 },
  // Moov MTN — Paiement
  { operator: 'MOOV', regex: /PAIEMENT (\d[\d ]*) F CFA/i, direction: 'DEBIT', amountGroup: 1 },
  // Wave — Réception
  { operator: 'WAVE', regex: /RECU (\d[\d ]*) F/i, direction: 'CREDIT', amountGroup: 1 },
  // Wave — Paiement
  { operator: 'WAVE', regex: /PAIEMENT (\d[\d ]*) F/i, direction: 'DEBIT', amountGroup: 1 },
];

/**
 * Parse un SMS bancaire pour en extraire les informations.
 *
 * @param address - Numéro/identifiant de l'expéditeur
 * @param body - Contenu textuel du SMS
 * @returns Informations parsées ou valeurs par défaut
 */
export function parseSms(address: string, body: string): ParsedSms {
  const upper = body.toUpperCase().trim();

  // Cherche un pattern correspondant
  for (const p of PATTERNS) {
    const match = upper.match(p.regex);
    if (match) {
      const raw = match[p.amountGroup]?.replace(/\s+/g, '');
      const amount = raw ? parseInt(raw, 10) : null;
      return {
        operator: p.operator,
        direction: p.direction,
        amount: Number.isNaN(amount) ? null : amount,
        sender: extractSender(upper, p.operator),
      };
    }
  }

  // Fallback : détection basique
  const hasCredit = /CREDIT|RECU|RECU|VIREMENT|DEPOT/i.test(upper);
  const hasDebit = /DEBIT|PAIEMENT|ENVOI|RETRAIT|ACHAT|FACTURE/i.test(upper);
  const amountMatch = upper.match(/(\d[\d ]*)\s*F(CFA)?/i);
  const rawAmount = amountMatch ? amountMatch[1]?.replace(/\s+/g, '') : null;
  const amount = rawAmount ? parseInt(rawAmount, 10) : null;

  return {
    operator: guessOperator(address, body),
    direction: hasCredit ? 'CREDIT' : hasDebit ? 'DEBIT' : null,
    amount: Number.isNaN(amount) ? null : amount,
    sender: null,
  };
}

/**
 * Devine l'opérateur à partir de l'adresse et du contenu.
 */
function guessOperator(address: string, body: string): string {
  const addr = address.toUpperCase();
  const text = body.toUpperCase();

  if (addr.includes('TMONEY') || text.includes('TMONEY')) return 'TMONEY';
  if (addr.includes('FLOOZ') || text.includes('FLOOZ')) return 'FLOOZ';
  if (addr.includes('MOOV') || text.includes('MOOV')) return 'MOOV';
  if (addr.includes('WAVE') || text.includes('WAVE')) return 'WAVE';
  if (addr.includes('MTN') || text.includes('MTN')) return 'MTN';
  if (addr.includes('ORANGE') || text.includes('ORANGE')) return 'ORANGE';
  if (addr.includes('FREE') || text.includes('FREE')) return 'FREE';

  return 'UNKNOWN';
}

/**
 * Extrait le nom de l'expéditeur/destinataire du message.
 */
function extractSender(text: string, operator: string): string | null {
  const patterns: Record<string, RegExp> = {
    TMONEY: /DE (.*?)(?:\.|\s+LE|\s+POUR|\s+N)/i,
    FLOOZ: /DE LA PART DE (.*?)(?:\.|\s+LE|\s+POUR)/i,
    MOOV: /DE (.*?)(?:\.|\s+LE|\s+POUR)/i,
  };

  const regex = patterns[operator];
  if (regex) {
    const match = text.match(regex);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}
