import { Transaction, TransactionStatus } from './types';

export function isCredit(tx: any, customerId: string) {
  return tx.receiverCustomerId === customerId;
}

export function getMonth(date: Date) {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

export function daysBetween(a: Date, b: Date) {
  return (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

export function parseUtcDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Filtre une liste de transactions selon plusieurs critères.
 * Si year/month/from/to ne sont pas fournis, aucune restriction temporelle n'est appliquée.
 */
export function filterTransactions(
  transactions: Transaction[],
  filters: {
    customerId?: string;
    type?: 'CREDIT' | 'DEBIT' | 'BOTH';
    year?: number;
    month?: number;
    from?: Date;
    to?: Date;
    status?: TransactionStatus;
  },
): Transaction[] {
  const {
    customerId,
    type = 'BOTH',
    year,
    month,
    from,
    to,
    status = TransactionStatus.POSTED,
  } = filters;

  return transactions.filter((tx) => {
    // 1. Filtre par statut (POSTED par défaut)
    if (tx.status && tx.status !== status) return false;

    // 2. Filtre par client et type (CREDIT/DEBIT)
    if (customerId) {
      const isSender = tx.senderCustomerId === customerId;
      const isReceiver = tx.receiverCustomerId === customerId;

      if (type === 'DEBIT' && !isSender) return false;
      if (type === 'CREDIT' && !isReceiver) return false;
      if (type === 'BOTH' && !isSender && !isReceiver) return false;
    }

    // 3. Filtre par plage de dates (Haute priorité)
    if (from && tx.transactionDate < from) return false;
    if (to && tx.transactionDate > to) return false;

    // 4. Filtre par Année / Mois (Seulement si from/to ne sont pas là)
    if (!from && !to) {
      const txDate = tx.transactionDate;
      if (year && txDate.getUTCFullYear() !== year) return false;
      if (month && txDate.getUTCMonth() + 1 !== month) return false;
    }

    return true;
  });
}
