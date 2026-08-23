/**
 * Normalise une date SMS vers un Date valide, ou null.
 * Accepte :
 *  - instance Date
 *  - timestamp epoch en millisecondes (number ou string numérique)
 *  - timestamp epoch en secondes (nombre < 1e12)
 *  - chaîne ISO / date parsable (new Date(str))
 */
export function normalizeDateSent(value: unknown): Date | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const ts = value < 1e12 ? value * 1000 : value;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return null;
      const ts = n < 1e12 ? n * 1000 : n;
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
