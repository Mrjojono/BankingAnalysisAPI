import { Entry, Transaction } from './types';

export function isCredit(tx: any, customerId: string) {
  return tx.receiverCustomerId === customerId;
}

export function getMonth(date: Date) {
  return date.toISOString().slice(0, 7);
}

export function parseUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d || 1));
}

/**
 * Filtre les transactions selon plusieurs critères.
 */
export function filterTransactions(
  transactions: Transaction[],
  options: {
    customerId: string;
    type?: 'DEBIT' | 'CREDIT';
    year?: number;
    month?: number;
    from?: Date;
    to?: Date;
  },
): Transaction[] {
  const { customerId, type, year, month, from, to } = options;

  return transactions.filter((tx) => {
    // 1. Filtrage par type (si spécifié)
    if (type) {
      const isTxCredit = tx.receiverCustomerId === customerId;
      if (type === 'CREDIT' && !isTxCredit) return false;
      if (type === 'DEBIT' && isTxCredit) return false;
    }

    // 2. Filtrage par date (range prioritaire)
    const txDate = tx.transactionDate;

    if (from && txDate < from) return false;
    if (to && txDate > to) return false;

    // 3. Filtrage par year/month (uniquement si pas de range)
    if (!from && !to) {
      if (year && txDate.getUTCFullYear() !== year) return false;
      if (month && txDate.getUTCMonth() + 1 !== month) return false;
    }

    return true;
  });
}

/**
 * Filtre les écritures comptables (Entries) selon plusieurs critères.
 */
export function filterEntries(
  entries: Entry[],
  options: {
    direction?: 'DEBIT' | 'CREDIT';
    accountType?:
      | 'CHECKING'
      | 'SAVINGS'
      | 'LOAN'
      | 'CORPORATE'
      | 'MOBILE_MONEY';
    includeMobileMoney?: boolean;
    year?: number;
    month?: number;
    from?: Date;
    to?: Date;
  },
): Entry[] {
  const { direction, accountType, includeMobileMoney, year, month, from, to } =
    options;

  return entries.filter((entry) => {
    // 1. Filtrage par direction
    if (direction && entry.direction !== direction) return false;

    // 2. Filtrage par type de compte
    if (
      accountType &&
      entry.account.bankAccount?.accountType !== accountType &&
      !(
        includeMobileMoney &&
        accountType === 'CHECKING' &&
        entry.account.bankAccount?.accountType === 'MOBILE_MONEY'
      )
    )
      return false;

    // 3. Filtrage par période
    const txDate = new Date(entry.transaction.transactionDate);

    if (from && txDate < from) return false;
    if (to && txDate > to) return false;

    if (!from && !to) {
      if (year && txDate.getUTCFullYear() !== year) return false;
      if (month && txDate.getUTCMonth() + 1 !== month) return false;
    }

    return true;
  });
}
